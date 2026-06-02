import { PrismaClient, PolicyTransitionType, PolicyCreationStatus, UploadedDocument } from '@prisma/client';
import { DocumentAccessService } from './documentAccess.service';
import { calculateAndSetCommission } from './policy.service';

const prisma = new PrismaClient();

export interface CreatePolicyTransitionInput {
  parentPolicyId: string;
  transitionType: PolicyTransitionType;
  newPolicyData: any; // This will be the policy creation data
  copyDocuments?: boolean;
  copyMembers?: boolean;
  copyProposer?: boolean;
}

export interface PolicyTransitionResult {
  newPolicy: any;
  documentReferences: any[];
  memberReferences: any[];
  errors: string[];
}

export class PolicyTransitionService {
  
  static async createPolicyTransition(
    parentPolicyId: string,
    transitionType: PolicyTransitionType,
    newPolicyData: any
  ): Promise<PolicyTransitionResult> {
    
    const result: PolicyTransitionResult = {
      newPolicy: null,
      documentReferences: [],
      memberReferences: [],
      errors: []
    };
    
    try {
      // 1. Get parent policy with all related data
      const parentPolicy = await prisma.policy.findUnique({
        where: { id: parentPolicyId },
        include: {
          company: true,
          policyGroup: true,
          proposer: true,
          members: true,
          nominee_payment: true,
          documents: true,
          form_values: true
        }
      });
      
      if (!parentPolicy) {
        throw new Error('Parent policy not found');
      }
      
      // 2. Log snapshot before in-place update (preserves history without extra policy rows)
      await prisma.policyTransitionLog.create({
        data: {
          policy_id: parentPolicyId,
          transition_type: parentPolicy.transition_type ?? undefined,
          policy_creation_status: parentPolicy.policy_creation_status ?? undefined,
          company_id: parentPolicy.company_id ?? undefined,
          company_name: (parentPolicy as any).company?.name ?? undefined,
          premium_amount: parentPolicy.premium_amount ?? undefined,
          sum_insured: parentPolicy.sum_insured ?? undefined,
          start_date: parentPolicy.start_date ?? undefined,
          end_date: parentPolicy.end_date ?? undefined,
          as_of_date: new Date(),
        },
      });

      // 3. Update same policy in place (replaces old company on portability/migration)
      const updatePayload = await this.buildInPlaceUpdatePayload(parentPolicy, newPolicyData, transitionType);
      const commissionInput = {
        ...parentPolicy,
        ...updatePayload,
        proposer: parentPolicy.proposer,
        policy_creation_status: this.getPolicyCreationStatus(transitionType),
      };
      await calculateAndSetCommission(commissionInput);
      if (commissionInput.calculated_commission_amount != null) {
        (updatePayload as Record<string, unknown>).calculated_commission_amount =
          commissionInput.calculated_commission_amount;
      }

      const newPolicy = await prisma.policy.update({
        where: { id: parentPolicyId },
        data: {
          ...(updatePayload as object),
          parent_policy_id: null,
          transition_type: transitionType,
          policy_creation_status: this.getPolicyCreationStatus(transitionType),
        },
        include: {
          company: true,
          policyName: true,
          policyGroup: true,
          proposer: true,
          members: true,
          nominee_payment: true,
          documents: true,
          form_values: true,
        },
      });
      result.newPolicy = newPolicy;

      // 4. Legacy child policies from old flow: detach so list shows one row
      await prisma.policy.updateMany({
        where: { parent_policy_id: parentPolicyId },
        data: { parent_policy_id: null },
      });

      result.documentReferences = [];

      DocumentAccessService.clearCache(parentPolicyId);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      result.errors.push(`Failed to create policy transition: ${errorMessage}`);
    }
    
    return result;
  }
  
  private static getPolicyCreationStatus(transitionType: PolicyTransitionType): PolicyCreationStatus {
    switch (transitionType) {
      case 'RENEWAL':
        return 'Renewal';
      case 'MIGRATION':
        return 'Migration';
      case 'PORTABILITY':
        return 'Portablity';
      default:
        return 'Fresh';
    }
  }

  /** Build Prisma update payload for in-place renew / portability / migration */
  private static async buildInPlaceUpdatePayload(
    parentPolicy: any,
    newPolicyData: any,
    transitionType: PolicyTransitionType
  ): Promise<Record<string, unknown>> {
    const processedData = {
      ...newPolicyData,
      premium_amount:
        typeof newPolicyData.premium_amount === 'string'
          ? parseFloat(newPolicyData.premium_amount)
          : newPolicyData.premium_amount,
      sum_insured:
        typeof newPolicyData.sum_insured === 'string'
          ? parseInt(newPolicyData.sum_insured, 10)
          : newPolicyData.sum_insured,
      tenure_years:
        typeof newPolicyData.tenure_years === 'string'
          ? parseInt(newPolicyData.tenure_years, 10)
          : newPolicyData.tenure_years,
      deductible_amount: newPolicyData.deductible_amount
        ? typeof newPolicyData.deductible_amount === 'string'
          ? parseInt(newPolicyData.deductible_amount, 10)
          : newPolicyData.deductible_amount
        : null,
      start_date: newPolicyData.start_date ? new Date(newPolicyData.start_date) : parentPolicy.start_date,
      end_date: newPolicyData.end_date ? new Date(newPolicyData.end_date) : parentPolicy.end_date,
      issued_date: newPolicyData.issued_date ? new Date(newPolicyData.issued_date) : parentPolicy.issued_date,
      policy_group_id: newPolicyData.policy_group_id || parentPolicy.policy_group_id || null,
      policy_type_id: newPolicyData.policy_type_id || parentPolicy.policy_type_id || null,
      policy_salutation: newPolicyData.policy_salutation || parentPolicy.policy_salutation || null,
      medical_condition:
        newPolicyData.medical_condition !== undefined
          ? newPolicyData.medical_condition
          : parentPolicy.medical_condition || false,
      medical_remarks: newPolicyData.medical_remarks || parentPolicy.medical_remarks || null,
      deductible_amount_status:
        newPolicyData.deductible_amount_status !== undefined
          ? newPolicyData.deductible_amount_status
          : parentPolicy.deductible_amount_status || false,
      declaration_accepted:
        newPolicyData.declaration_accepted !== undefined
          ? newPolicyData.declaration_accepted
          : parentPolicy.declaration_accepted || false,
      emi_amount: newPolicyData.emi_amount ?? parentPolicy.emi_amount ?? null,
      policy_creation_status: this.getPolicyCreationStatus(transitionType),
    };

    const companyId =
      transitionType === 'PORTABILITY' || transitionType === 'MIGRATION'
        ? newPolicyData.company_id || parentPolicy.company_id
        : newPolicyData.company_id ?? parentPolicy.company_id;

    const fields: Record<string, unknown> = {
      policy_number: processedData.policy_number ?? parentPolicy.policy_number,
      customer_name: processedData.customer_name ?? parentPolicy.customer_name,
      company_id: companyId,
      policy_name_id: newPolicyData.policy_name_id ?? parentPolicy.policy_name_id,
      premium_amount: processedData.premium_amount ?? parentPolicy.premium_amount,
      sum_insured: processedData.sum_insured ?? parentPolicy.sum_insured,
      tenure_years: processedData.tenure_years ?? parentPolicy.tenure_years,
      start_date: processedData.start_date,
      end_date: processedData.end_date,
      issued_date: processedData.issued_date,
      policy_group_id: processedData.policy_group_id,
      policy_type_id: processedData.policy_type_id,
      policy_salutation: processedData.policy_salutation,
      medical_condition: processedData.medical_condition,
      medical_remarks: processedData.medical_remarks,
      deductible_amount: processedData.deductible_amount,
      deductible_amount_status: processedData.deductible_amount_status,
      declaration_accepted: processedData.declaration_accepted,
      emi_amount: processedData.emi_amount,
      gst_status: newPolicyData.gst_status ?? parentPolicy.gst_status,
      premium_amount_gst: newPolicyData.premium_amount_gst ?? parentPolicy.premium_amount_gst,
      remarks: newPolicyData.remarks ?? parentPolicy.remarks,
      policy_creation_status: processedData.policy_creation_status,
    };

    return fields;
  }
  
  private static async createPolicyWithCarriedOverData(parentPolicy: any, newPolicyData: any): Promise<any> {
    // Convert string values to appropriate types for Prisma
    const processedData = {
      ...newPolicyData,
      // Convert numeric strings to numbers
      premium_amount: typeof newPolicyData.premium_amount === 'string' 
        ? parseFloat(newPolicyData.premium_amount) 
        : newPolicyData.premium_amount,
      sum_insured: typeof newPolicyData.sum_insured === 'string' 
        ? parseInt(newPolicyData.sum_insured) 
        : newPolicyData.sum_insured,
      tenure_years: typeof newPolicyData.tenure_years === 'string' 
        ? parseInt(newPolicyData.tenure_years) 
        : newPolicyData.tenure_years,
      // Ensure other numeric fields are properly typed
      deductible_amount: newPolicyData.deductible_amount ? 
        (typeof newPolicyData.deductible_amount === 'string' 
          ? parseInt(newPolicyData.deductible_amount) 
          : newPolicyData.deductible_amount) : null,
      // Convert date strings to DateTime objects
      start_date: newPolicyData.start_date ? new Date(newPolicyData.start_date) : null,
      end_date: newPolicyData.end_date ? new Date(newPolicyData.end_date) : null,
      issued_date: newPolicyData.issued_date ? new Date(newPolicyData.issued_date) : null,
      // Add default values for required fields
      policy_creation_status: newPolicyData.policy_creation_status || 'Fresh',
      created_by: 'system', // You might want to get this from the authenticated user
      // Carry over important fields from parent policy if not provided in new data
      policy_group_id: newPolicyData.policy_group_id || parentPolicy.policy_group_id || null,
      policy_type_id: newPolicyData.policy_type_id || parentPolicy.policy_type_id || null,
      policy_salutation: newPolicyData.policy_salutation || parentPolicy.policy_salutation || null,
      medical_condition: newPolicyData.medical_condition !== undefined ? newPolicyData.medical_condition : parentPolicy.medical_condition || false,
      medical_remarks: newPolicyData.medical_remarks || parentPolicy.medical_remarks || null,
      deductible_amount_status: newPolicyData.deductible_amount_status !== undefined ? newPolicyData.deductible_amount_status : parentPolicy.deductible_amount_status || false,
      declaration_accepted: newPolicyData.declaration_accepted !== undefined ? newPolicyData.declaration_accepted : parentPolicy.declaration_accepted || false,
      // Carry over financial fields from parent if not provided
      emi_amount: newPolicyData.emi_amount || parentPolicy.emi_amount || null,
      commission_add_on_percentage: newPolicyData.commission_add_on_percentage || parentPolicy.commission_add_on_percentage || null,
      calculated_commission_amount: newPolicyData.calculated_commission_amount || parentPolicy.calculated_commission_amount || null,
    };

    // Create the new policy with all carried over data
    const createData: any = {
      ...processedData,
    };

    // Carry over proposer data if exists
    if (parentPolicy.proposer) {
      createData.proposer = {
        create: {
          proposer_salutation: parentPolicy.proposer.proposer_salutation || null,
          full_name: parentPolicy.proposer.full_name || '',
          date_of_birth: parentPolicy.proposer.date_of_birth || null,
          gender: parentPolicy.proposer.gender || null,
          marital_status: parentPolicy.proposer.marital_status || null,
          mobile: parentPolicy.proposer.mobile || '',
          alternate_mobile: parentPolicy.proposer.alternate_mobile || null,
          email: parentPolicy.proposer.email || null,
          address: parentPolicy.proposer.address || '',
          kyc_id: parentPolicy.proposer.kyc_id || null,
          occupation: parentPolicy.proposer.occupation || null,
          nationality: parentPolicy.proposer.nationality || null,
        }
      };
    }

    // Carry over nominee and payment data if exists
    if (parentPolicy.nominee_payment) {
      createData.nominee_payment = {
        create: {
          nominee_salutation: parentPolicy.nominee_payment.nominee_salutation || null,
          nominee_name: parentPolicy.nominee_payment.nominee_name || '',
          nominee_relation: parentPolicy.nominee_payment.nominee_relation || null,
          nominee_dob: parentPolicy.nominee_payment.nominee_dob || null,
          payment_mode: parentPolicy.nominee_payment.payment_mode || null,
          payment_reference: parentPolicy.nominee_payment.payment_reference || null,
          bank_name: parentPolicy.nominee_payment.bank_name || null,
          bank_account_number: parentPolicy.nominee_payment.bank_account_number || null,
          bank_ifsc_code: parentPolicy.nominee_payment.bank_ifsc_code || null,
          bank_branch_name: parentPolicy.nominee_payment.bank_branch_name || null,
        }
      };
    }

    // Carry over form values if exists
    if (parentPolicy.form_values && parentPolicy.form_values.length > 0) {
      createData.form_values = {
        create: parentPolicy.form_values.map((formValue: any) => ({
          field_name: formValue.field_name || '',
          value: formValue.value || '',
        }))
      };
    }

    // First create the policy with proposer, nominee, and form values
    const newPolicy = await prisma.policy.create({
      data: createData,
      include: {
        proposer: true,
        nominee_payment: true,
        form_values: true
      }
    });

    // Then create members separately if they exist (because they need proposer_id)
    if (parentPolicy.members && parentPolicy.members.length > 0 && newPolicy.proposer) {
      const membersToCreate = parentPolicy.members.map((member: any) => ({
        policy_id: newPolicy.id,
        proposer_id: newPolicy.proposer!.id, // Using non-null assertion since we checked above
        insured_member_salutation: member.insured_member_salutation || null,
        name: member.name || '',
        relation_to_proposer: member.relation_to_proposer || null,
        date_of_birth: member.date_of_birth || null,
        gender: member.gender || null,
        pre_existing: member.pre_existing || false,
        insured_member_medical_condition: member.insured_member_medical_condition || false,
        insured_member_medical_remarks: member.insured_member_medical_remarks || null,
      }));

      await prisma.insuredMember.createMany({
        data: membersToCreate
      });
    }

    // Return the complete policy with all relations
    return await prisma.policy.findUnique({
      where: { id: newPolicy.id },
      include: {
        proposer: true,
        members: true,
        nominee_payment: true,
        documents: true,
        form_values: true
      }
    });
  }

  private static async createPolicy(policyData: any): Promise<any> {
    // Convert string values to appropriate types for Prisma
    const processedData = {
      ...policyData,
      // Convert numeric strings to numbers
      premium_amount: typeof policyData.premium_amount === 'string' 
        ? parseFloat(policyData.premium_amount) 
        : policyData.premium_amount,
      sum_insured: typeof policyData.sum_insured === 'string' 
        ? parseInt(policyData.sum_insured) 
        : policyData.sum_insured,
      tenure_years: typeof policyData.tenure_years === 'string' 
        ? parseInt(policyData.tenure_years) 
        : policyData.tenure_years,
      // Ensure other numeric fields are properly typed
      deductible_amount: policyData.deductible_amount ? 
        (typeof policyData.deductible_amount === 'string' 
          ? parseInt(policyData.deductible_amount) 
          : policyData.deductible_amount) : null,
      emi_amount: policyData.emi_amount ? 
        (typeof policyData.emi_amount === 'string' 
          ? parseInt(policyData.emi_amount) 
          : policyData.emi_amount) : null,
      commission_add_on_percentage: policyData.commission_add_on_percentage ? 
        (typeof policyData.commission_add_on_percentage === 'string' 
          ? parseInt(policyData.commission_add_on_percentage) 
          : policyData.commission_add_on_percentage) : null,
      calculated_commission_amount: policyData.calculated_commission_amount ? 
        (typeof policyData.calculated_commission_amount === 'string' 
          ? parseFloat(policyData.calculated_commission_amount) 
          : policyData.calculated_commission_amount) : null,
      // Convert date strings to DateTime objects
      start_date: policyData.start_date ? new Date(policyData.start_date) : null,
      end_date: policyData.end_date ? new Date(policyData.end_date) : null,
      issued_date: policyData.issued_date ? new Date(policyData.issued_date) : null,
      // Add default values for required fields
      policy_creation_status: policyData.policy_creation_status || 'Fresh',
      created_by: 'system', // You might want to get this from the authenticated user
      // Ensure these fields are properly set
      policy_group_id: policyData.policy_group_id || null,
      policy_type_id: policyData.policy_type_id || null,
    };

    return await prisma.policy.create({
      data: processedData,
      include: {
        proposer: true,
        members: true,
        nominee_payment: true,
        documents: true
      }
    });
  }
  
  private static async createDocumentReferences(
    parentPolicyId: string,
    newPolicyId: string,
    transitionType: PolicyTransitionType
  ): Promise<any[]> {
    
    console.log(`🔗 [DocumentTransfer] Starting recursive document transfer for policy ${newPolicyId}`);
    
    // Get all ancestor policies recursively
    const ancestorPolicies = await this.getAllAncestorPolicies(parentPolicyId);
    console.log(`🔗 [DocumentTransfer] Found ${ancestorPolicies.length} ancestor policies`);
    
    // Collect ALL documents from all ancestor policies
    const allAncestorDocuments: any[] = [];
    
    for (const ancestorPolicy of ancestorPolicies) {
      console.log(`🔗 [DocumentTransfer] Processing ancestor policy: ${ancestorPolicy.id} (${ancestorPolicy.policy_number})`);
      
      // 1. Direct policy documents
      if (ancestorPolicy.documents) {
        allAncestorDocuments.push(...ancestorPolicy.documents.map((doc: any) => ({
          ...doc,
          source_policy_id: ancestorPolicy.id,
          source_policy_number: ancestorPolicy.policy_number
        })));
      }
      
      // 2. Proposer documents
      if (ancestorPolicy.proposer?.documents) {
        allAncestorDocuments.push(...ancestorPolicy.proposer.documents.map((doc: any) => ({
          ...doc,
          source_policy_id: ancestorPolicy.id,
          source_policy_number: ancestorPolicy.policy_number
        })));
      }
      
      // 3. Member documents
      if (ancestorPolicy.proposer?.insured_members) {
        ancestorPolicy.proposer.insured_members.forEach((member: any) => {
          if (member.documents) {
            allAncestorDocuments.push(...member.documents.map((doc: any) => ({
              ...doc,
              source_policy_id: ancestorPolicy.id,
              source_policy_number: ancestorPolicy.policy_number,
              source_member_id: member.id
            })));
          }
        });
      }
    }
    
    console.log(`📄 [DocumentTransfer] Collected ${allAncestorDocuments.length} total documents from all ancestors`);
    
    // Filter documents based on transition type
    const documentsToReference = this.filterDocumentsByTransitionType(
      allAncestorDocuments,
      transitionType
    );
    
    console.log(`🔗 [DocumentTransfer] Creating references for ${documentsToReference.length} documents`);
    
    // Create references in batch for efficiency
    const referenceData = documentsToReference.map(doc => ({
      policy_id: newPolicyId,
      source_document_id: doc.id,
      transition_type: transitionType,
      can_edit: false,
      can_delete: true  // Allow users to remove references if not needed
    }));
    
    const createdRefs = await prisma.policyDocumentReference.createMany({
      data: referenceData,
      skipDuplicates: true
    });
    
    console.log(`✅ [DocumentTransfer] Created ${createdRefs.count} document references`);
    
    // Return the created references
    return await prisma.policyDocumentReference.findMany({
      where: { 
        policy_id: newPolicyId,
        transition_type: transitionType
      },
      include: {
        source_document: true
      }
    });
  }
  
  /**
   * Recursively get all ancestor policies (parent, grandparent, etc.)
   */
  private static async getAllAncestorPolicies(policyId: string): Promise<any[]> {
    const ancestors: any[] = [];
    let currentPolicyId = policyId;
    
    while (currentPolicyId) {
      const policy = await prisma.policy.findUnique({
        where: { id: currentPolicyId },
        include: {
          company: true,
          policyName: true,
          documents: true,
          proposer: {
            include: {
              documents: true,
              insured_members: {
                include: {
                  documents: true
                }
              }
            }
          }
        }
      });
      
      if (!policy) {
        console.log(`❌ [DocumentTransfer] Policy ${currentPolicyId} not found`);
        break;
      }
      
      ancestors.push(policy);
      console.log(`🔗 [DocumentTransfer] Added ancestor: ${policy.policy_number} (${policy.id})`);
      
      // Move to parent policy
      currentPolicyId = policy.parent_policy_id || '';
    }
    
    console.log(`🔗 [DocumentTransfer] Total ancestors found: ${ancestors.length}`);
    return ancestors;
  }
  
  private static filterDocumentsByTransitionType(
    documents: UploadedDocument[],
    transitionType: PolicyTransitionType
  ): UploadedDocument[] {
    
    // For now, carry over ALL documents from the parent policy
    // This ensures all documents are available in the new policy
    return documents;
    
    // Original filtering logic (commented out for now)
    /*
    switch (transitionType) {
      case 'RENEWAL':
        return documents.filter(doc => 
          doc.category !== 'CLAIM_DOCUMENT'
        );
        
      case 'MIGRATION':
        return documents.filter(doc => 
          (doc.category && ['POLICY_DOCUMENT', 'PROPOSER_DOCUMENT'].includes(doc.category)) ||
          (doc.category === 'INSURED_MEMBER_DOCUMENT' && this.isRecentDocument(doc))
        );
        
      case 'PORTABILITY':
        return documents.filter(doc => 
          doc.category === 'POLICY_DOCUMENT' ||
          (doc.category === 'INSURED_MEMBER_DOCUMENT' && this.isHealthDocument(doc))
        );
        
      default:
        return documents;
    }
    */
  }
  
  private static isRecentDocument(doc: UploadedDocument): boolean {
    if (!doc.created_at) return false;
    
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    return new Date(doc.created_at) > twoYearsAgo;
  }
  
  private static isHealthDocument(doc: UploadedDocument): boolean {
    // Check if document is health-related based on name or category
    const healthKeywords = ['medical', 'health', 'hospital', 'doctor', 'prescription'];
    const fileName = doc.original_name?.toLowerCase() || '';
    
    return healthKeywords.some(keyword => fileName.includes(keyword));
  }
  
  /**
   * Build year-wise claim summary for a given policy between its start and end years.
   */
  private static async buildClaimsByYear(policy: any): Promise<Array<{ year: number; hasClaim: boolean; claimCount: number; totalPaid: number }>> {
    const start = policy.start_date ? new Date(policy.start_date) : null;
    const end = policy.end_date ? new Date(policy.end_date) : null;
    if (!start || !end) return [];

    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    const claims = await prisma.claim.findMany({
      where: {
        policy_id: policy.id,
        is_deleted: false,
        claim_date: { not: null }
      },
      select: {
        claim_date: true,
        claim_status: true,
        claim_amount: true
      }
    });

    const claimsByYearMap = new Map<number, { count: number; totalPaid: number }>();
    for (const c of claims) {
      if (!c.claim_date) continue;
      const y = new Date(c.claim_date as unknown as Date).getFullYear();
      const prev = claimsByYearMap.get(y) || { count: 0, totalPaid: 0 };
      prev.count += 1;
      if (c.claim_status === 'Approved' || c.claim_status === 'Paid') {
        prev.totalPaid += Number(c.claim_amount || 0);
      }
      claimsByYearMap.set(y, prev);
    }

    const summary: Array<{ year: number; hasClaim: boolean; claimCount: number; totalPaid: number }> = [];
    for (let y = startYear; y <= endYear; y++) {
      const stats = claimsByYearMap.get(y);
      summary.push({
        year: y,
        hasClaim: !!stats && stats.count > 0,
        claimCount: stats?.count || 0,
        totalPaid: stats?.totalPaid || 0
      });
    }
    return summary;
  }
  
  static async getPolicyTransitionHistory(policyId: string): Promise<{
    parentPolicy?: any;
    childrenPolicies: any[];
    transitionHistory: any[];
    completeHierarchy: any[];
  }> {
    let policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        company: true,
        policyName: true,
        policyGroup: true,
        parent_policy: { include: { company: true, policyName: true } },
        children_policies: { include: { company: true, policyName: true } },
      },
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    // Resolve to leaf policy for consolidated view (legacy chains)
    let leaf = policy;
    while (leaf.children_policies?.length) {
      const latestChild = [...leaf.children_policies].sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      })[0];
      leaf = await prisma.policy.findUnique({
        where: { id: latestChild.id },
        include: {
          company: true,
          policyName: true,
          policyGroup: true,
          parent_policy: { include: { company: true, policyName: true } },
          children_policies: { include: { company: true, policyName: true } },
        },
      }) as typeof policy;
    }
    policy = leaf!;

    const logs = await prisma.policyTransitionLog.findMany({
      where: { policy_id: policy.id },
      orderBy: { as_of_date: 'asc' },
    });

    const statusTimeline: Array<{
      status: string;
      as_of: string;
      company_name?: string;
      transition_type?: string;
      premium_amount?: number;
      sum_insured?: number;
    }> = logs.map((log) => ({
      status: log.policy_creation_status || 'Fresh',
      as_of: log.as_of_date.toISOString(),
      company_name: log.company_name || undefined,
      transition_type: log.transition_type || undefined,
      premium_amount: log.premium_amount ?? undefined,
      sum_insured: log.sum_insured ?? undefined,
    }));

    statusTimeline.push({
      status: policy.policy_creation_status || 'Fresh',
      as_of: (policy.updated_at || policy.created_at || new Date()).toISOString(),
      company_name: policy.company?.name ?? undefined,
      transition_type: policy.transition_type || undefined,
      premium_amount: policy.premium_amount ?? undefined,
      sum_insured: policy.sum_insured ?? undefined,
    });

    const completeHierarchy = [
      {
        policy,
        relationship: 'CURRENT',
        transition_type: policy.transition_type,
        position: 'CURRENT',
        generation: 0,
        statusTimeline,
        claimsByYear: await this.buildClaimsByYear(policy).catch(() => []),
      },
    ];

    return {
      parentPolicy: policy.parent_policy,
      childrenPolicies: [],
      transitionHistory: [],
      completeHierarchy,
    };
  }
  
  static async validateTransitionEligibility(
    parentPolicyId: string,
    transitionType: PolicyTransitionType
  ): Promise<{
    eligible: boolean;
    reasons: string[];
    requirements: string[];
  }> {
    
    const policy = await prisma.policy.findUnique({
      where: { id: parentPolicyId },
      include: {
        documents: true,
        members: true,
        proposer: true
      }
    });
    
    if (!policy) {
      return {
        eligible: false,
        reasons: ['Policy not found'],
        requirements: []
      };
    }
    
    // All policies are eligible for transitions (no restrictions)
    return {
      eligible: true,
      reasons: [],
      requirements: []
    };
  }

  /**
   * Delete a document reference (remove link to ancestor document)
   */
  static async deleteDocumentReference(referenceId: string): Promise<boolean> {
    try {
      // Check if reference exists
      const reference = await prisma.policyDocumentReference.findUnique({
        where: { id: referenceId },
        include: {
          source_document: true,
          policy: true
        }
      });

      if (!reference) {
        throw new Error('Document reference not found');
      }

      // Allow deletion regardless of can_delete flag for now
      // This ensures existing references can be removed
      console.log(`🗑️ [DocumentReference] Deleting reference ${referenceId} (can_delete: ${reference.can_delete})`);

      // Delete the reference
      await prisma.policyDocumentReference.delete({
        where: { id: referenceId }
      });

      // Clear cache for the policy
      DocumentAccessService.clearCache(reference.policy_id);

      console.log(`✅ [DocumentReference] Successfully deleted reference ${referenceId} for policy ${reference.policy_id}`);
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`❌ [DocumentReference] Failed to delete reference ${referenceId}:`, errorMessage);
      throw new Error(`Failed to delete document reference: ${errorMessage}`);
    }
  }

  /**
   * Update existing document references to make them deletable
   * This is a one-time migration function for existing references
   */
  static async updateExistingReferencesToDeletable(): Promise<{ updated: number }> {
    try {
      const result = await prisma.policyDocumentReference.updateMany({
        where: {
          can_delete: false
        },
        data: {
          can_delete: true
        }
      });

      console.log(`🔄 [DocumentReference] Updated ${result.count} existing references to be deletable`);
      return { updated: result.count };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`❌ [DocumentReference] Failed to update existing references:`, errorMessage);
      throw new Error(`Failed to update existing references: ${errorMessage}`);
    }
  }

  /**
   * Get document transfer statistics for a policy transition
   */
  static async getDocumentTransferStats(
    parentPolicyId: string,
    transitionType: PolicyTransitionType
  ): Promise<{
    totalDocuments: number;
    ancestorPolicies: Array<{
      policyId: string;
      policyNumber: string;
      documentCount: number;
      policyDocuments: number;
      proposerDocuments: number;
      memberDocuments: number;
    }>;
    documentBreakdown: {
      policyDocuments: number;
      proposerDocuments: number;
      memberDocuments: number;
    };
  }> {
    
    console.log(`📊 [DocumentStats] Getting transfer statistics for policy ${parentPolicyId}`);
    
    // Get all ancestor policies recursively
    const ancestorPolicies = await this.getAllAncestorPolicies(parentPolicyId);
    
    const stats = {
      totalDocuments: 0,
      ancestorPolicies: [] as Array<{
        policyId: string;
        policyNumber: string;
        documentCount: number;
        policyDocuments: number;
        proposerDocuments: number;
        memberDocuments: number;
      }>,
      documentBreakdown: {
        policyDocuments: 0,
        proposerDocuments: 0,
        memberDocuments: 0
      }
    };
    
    for (const ancestorPolicy of ancestorPolicies) {
      let policyDocs = 0;
      let proposerDocs = 0;
      let memberDocs = 0;
      
      // Count policy documents
      if (ancestorPolicy.documents) {
        policyDocs = ancestorPolicy.documents.length;
        stats.documentBreakdown.policyDocuments += policyDocs;
      }
      
      // Count proposer documents
      if (ancestorPolicy.proposer?.documents) {
        proposerDocs = ancestorPolicy.proposer.documents.length;
        stats.documentBreakdown.proposerDocuments += proposerDocs;
      }
      
      // Count member documents
      if (ancestorPolicy.proposer?.insured_members) {
        ancestorPolicy.proposer.insured_members.forEach((member: any) => {
          if (member.documents) {
            memberDocs += member.documents.length;
          }
        });
        stats.documentBreakdown.memberDocuments += memberDocs;
      }
      
      const totalDocs = policyDocs + proposerDocs + memberDocs;
      stats.totalDocuments += totalDocs;
      
      stats.ancestorPolicies.push({
        policyId: ancestorPolicy.id,
        policyNumber: ancestorPolicy.policy_number || 'Unknown',
        documentCount: totalDocs,
        policyDocuments: policyDocs,
        proposerDocuments: proposerDocs,
        memberDocuments: memberDocs
      });
    }
    
    console.log(`📊 [DocumentStats] Statistics:`, {
      totalDocuments: stats.totalDocuments,
      ancestorCount: stats.ancestorPolicies.length,
      breakdown: stats.documentBreakdown
    });
    
    return stats;
  }
} 