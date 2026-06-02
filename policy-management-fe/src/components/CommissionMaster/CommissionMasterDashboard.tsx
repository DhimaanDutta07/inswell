import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Plus, Pencil, Search, Calculator } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import type { CommissionMaster, PolicyTransaction } from "../../types/index";
import {
  getAllCommissionMaster,
  createCommissionMaster,
  updateCommissionMaster,
  updateCommissionMasterStatus,
} from "../../services/commissionMaster.service";
import {
  getAllPolicyTransactions,
  createPolicyTransaction,
} from "../../services/policyTransaction.service";

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: unknown } | undefined;
    if (data && typeof data.error === "string") return data.error;
  }
  return fallback;
};

const toNum = (v: string | number | undefined | null): number =>
  v === undefined || v === null ? 0 : typeof v === "number" ? v : parseFloat(v) || 0;

const formatINR = (v: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(toNum(v));

interface MasterFormState {
  id?: string;
  category: string;
  sub_category: string;
  commission_percentage: string;
  is_active: boolean;
}

const emptyMasterForm: MasterFormState = {
  category: "",
  sub_category: "",
  commission_percentage: "",
  is_active: true,
};

const COMMISSION_OPTIONS: { category: string; sub_categories: string[] }[] = [
  { category: "Optima Secure", sub_categories: ["Fresh", "Portability - 25K Deductible (All SI)"] },
  {
    category: "Other Retail",
    sub_categories: [
      "Fresh - Less than 10 Lakhs",
      "Fresh - Greater than or equal to 10 Lakhs",
      "Portability - 25K Deductible (All SI)",
      "Portability - Less than 10 Lakhs",
    ],
  },
  {
    category: "STU",
    sub_categories: [
      "Fresh - Greater than or equal to 10 Lakhs",
      "Portability - Less than 10 Lakhs",
    ],
  },
  { category: "PA (Fresh)", sub_categories: ["Greater than or equal to 10 Lakhs"] },
  { category: "SME (Fresh)", sub_categories: ["Less than 10 Lakhs"] },
  { category: "SME", sub_categories: ["Greater than or equal to 10 Lakhs"] },
  { category: "Travel", sub_categories: ["All SI"] },
  { category: "All", sub_categories: ["All SI"] },
];

const CommissionMasterDashboard: React.FC = () => {
  const [masters, setMasters] = useState<CommissionMaster[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [search, setSearch] = useState("");

  // Master add/edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<MasterFormState>(emptyMasterForm);
  const [savingMaster, setSavingMaster] = useState(false);

  // Policy transaction form
  const [txns, setTxns] = useState<PolicyTransaction[]>([]);
  const [txnCategory, setTxnCategory] = useState("");
  const [txnSubCategory, setTxnSubCategory] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [premium, setPremium] = useState("");
  const [savingTxn, setSavingTxn] = useState(false);

  const fetchMasters = async () => {
    setLoadingMasters(true);
    try {
      const data = await getAllCommissionMaster();
      setMasters(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load commission master");
    } finally {
      setLoadingMasters(false);
    }
  };

  const fetchTxns = async () => {
    try {
      const data = await getAllPolicyTransactions();
      setTxns(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMasters();
    fetchTxns();
  }, []);

  const filteredMasters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return masters;
    return masters.filter(
      (m) =>
        m.category.toLowerCase().includes(q) ||
        m.sub_category.toLowerCase().includes(q)
    );
  }, [masters, search]);

  // Active masters only, for the policy transaction dropdowns.
  const activeMasters = useMemo(
    () => masters.filter((m) => m.is_active),
    [masters]
  );

  const txnCategories = useMemo(
    () => Array.from(new Set(activeMasters.map((m) => m.category))),
    [activeMasters]
  );

  const txnSubCategories = useMemo(
    () =>
      activeMasters
        .filter((m) => m.category === txnCategory)
        .map((m) => m.sub_category),
    [activeMasters, txnCategory]
  );

  const selectedMaster = useMemo(
    () =>
      activeMasters.find(
        (m) => m.category === txnCategory && m.sub_category === txnSubCategory
      ),
    [activeMasters, txnCategory, txnSubCategory]
  );

  const previewPercentage = selectedMaster
    ? toNum(selectedMaster.commission_percentage)
    : 0;
  const previewCommission = (toNum(premium) * previewPercentage) / 100;

  // ---- Master CRUD handlers ----
  const openAdd = () => {
    setForm(emptyMasterForm);
    setModalOpen(true);
  };

  const openEdit = (m: CommissionMaster) => {
    setForm({
      id: m.id,
      category: m.category,
      sub_category: m.sub_category,
      commission_percentage: String(toNum(m.commission_percentage)),
      is_active: m.is_active,
    });
    setModalOpen(true);
  };

  const handleSaveMaster = async () => {
    if (!form.category.trim() || !form.sub_category.trim()) {
      toast.error("Category and sub-category are required");
      return;
    }
    const pct = parseFloat(form.commission_percentage);
    if (Number.isNaN(pct) || pct < 0) {
      toast.error("Enter a valid commission percentage");
      return;
    }

    setSavingMaster(true);
    try {
      if (form.id) {
        await updateCommissionMaster(form.id, {
          category: form.category.trim(),
          sub_category: form.sub_category.trim(),
          commission_percentage: pct,
          is_active: form.is_active,
        });
        toast.success("Commission updated");
      } else {
        await createCommissionMaster({
          category: form.category.trim(),
          sub_category: form.sub_category.trim(),
          commission_percentage: pct,
          is_active: form.is_active,
        });
        toast.success("Commission added");
      }
      setModalOpen(false);
      await fetchMasters();
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Failed to save commission"));
    } finally {
      setSavingMaster(false);
    }
  };

  const handleToggleStatus = async (m: CommissionMaster) => {
    // Optimistic update.
    setMasters((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, is_active: !x.is_active } : x))
    );
    try {
      await updateCommissionMasterStatus(m.id, !m.is_active);
      toast.success(`${!m.is_active ? "Activated" : "Deactivated"} ${m.category}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
      // Revert on failure.
      setMasters((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, is_active: m.is_active } : x))
      );
    }
  };

  // ---- Policy transaction handler ----
  const handleCreateTxn = async () => {
    if (!policyNumber.trim() || !customerName.trim()) {
      toast.error("Policy number and customer name are required");
      return;
    }
    if (!txnCategory || !txnSubCategory) {
      toast.error("Select a category and sub-category");
      return;
    }
    if (!selectedMaster) {
      toast.error("No active commission found for this selection");
      return;
    }
    const premiumNum = parseFloat(premium);
    if (Number.isNaN(premiumNum) || premiumNum <= 0) {
      toast.error("Enter a valid premium amount");
      return;
    }

    setSavingTxn(true);
    try {
      await createPolicyTransaction({
        policy_number: policyNumber.trim(),
        customer_name: customerName.trim(),
        category: txnCategory,
        sub_category: txnSubCategory,
        premium_amount: premiumNum,
      });
      toast.success("Policy transaction recorded");
      setPolicyNumber("");
      setCustomerName("");
      setPremium("");
      setTxnCategory("");
      setTxnSubCategory("");
      await fetchTxns();
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Failed to record transaction"));
    } finally {
      setSavingTxn(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commission Management</h1>
        <p className="text-muted-foreground text-sm">
          Manage commission percentages by category and record policy
          transactions with automatic commission calculation.
        </p>
      </div>

      <Tabs defaultValue="master" className="w-full">
        <TabsList>
          <TabsTrigger value="master">Commission Master</TabsTrigger>
          <TabsTrigger value="transactions">Record Policy</TabsTrigger>
        </TabsList>

        {/* ---------- Commission Master ---------- */}
        <TabsContent value="master" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search category / sub-category"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" /> Add Commission %
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Sub-category</TableHead>
                    <TableHead className="text-right">Commission %</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMasters ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredMasters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No commission entries found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMasters.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.category}</TableCell>
                        <TableCell>{m.sub_category}</TableCell>
                        <TableCell className="text-right">
                          {toNum(m.commission_percentage).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={m.is_active}
                              onCheckedChange={() => handleToggleStatus(m)}
                              aria-label="Toggle active"
                            />
                            <Badge variant={m.is_active ? "default" : "secondary"}>
                              {m.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Record Policy Transaction ---------- */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Record Policy Transaction</CardTitle>
                <CardDescription>
                  Commission is auto-calculated from the active commission master.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Policy Number</Label>
                  <Input
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    placeholder="POL-0001"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Customer Name</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={txnCategory}
                    onValueChange={(v) => {
                      setTxnCategory(v);
                      setTxnSubCategory("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {txnCategories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Sub-category</Label>
                  <Select
                    value={txnSubCategory}
                    onValueChange={setTxnSubCategory}
                    disabled={!txnCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-category" />
                    </SelectTrigger>
                    <SelectContent>
                      {txnSubCategories.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Premium Amount</Label>
                  <Input
                    type="number"
                    value={premium}
                    onChange={(e) => setPremium(e.target.value)}
                    placeholder="50000"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateTxn}
                  disabled={savingTxn}
                >
                  {savingTxn ? "Saving…" : "Record Transaction"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" /> Commission Preview
                </CardTitle>
                <CardDescription>
                  Commission Amount = (Premium × Commission %) / 100
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Premium Amount</span>
                  <span className="font-medium">{formatINR(toNum(premium))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commission %</span>
                  <span className="font-medium">
                    {selectedMaster ? `${previewPercentage.toFixed(2)}%` : "—"}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-semibold">Commission Amount</span>
                  <span className="font-bold text-green-600">
                    {formatINR(previewCommission)}
                  </span>
                </div>
                {txnCategory && txnSubCategory && !selectedMaster && (
                  <p className="text-sm text-red-500">
                    No active commission entry for this selection.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sub-category</TableHead>
                    <TableHead className="text-right">Premium</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No transactions yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    txns.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.policy_number}</TableCell>
                        <TableCell>{t.customer_name}</TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell>{t.sub_category}</TableCell>
                        <TableCell className="text-right">{formatINR(t.premium_amount)}</TableCell>
                        <TableCell className="text-right">
                          {toNum(t.commission_percentage).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatINR(t.commission_amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Commission" : "Add Commission"}</DialogTitle>
            <DialogDescription>
              Set the commission percentage for a category and sub-category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v, sub_category: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {COMMISSION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.category} value={opt.category}>
                      {opt.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sub-category</Label>
              <Select
                value={form.sub_category}
                onValueChange={(v) => setForm({ ...form, sub_category: v })}
                disabled={!form.category}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-category" />
                </SelectTrigger>
                <SelectContent>
                  {(COMMISSION_OPTIONS.find(o => o.category === form.category)?.sub_categories || []).map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Commission %</Label>
              <Input
                type="number"
                step="0.01"
                value={form.commission_percentage}
                onChange={(e) =>
                  setForm({ ...form, commission_percentage: e.target.value })
                }
                placeholder="12.50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMaster} disabled={savingMaster}>
              {savingMaster ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommissionMasterDashboard;
