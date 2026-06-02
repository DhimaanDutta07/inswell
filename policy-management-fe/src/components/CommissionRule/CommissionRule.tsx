import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, Save, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  COMMISSION_CATEGORY_TREE,
  PRODUCT_CATEGORY_LABELS,
  type ProductCategoryKey,
} from "../../constants/commissionCategories";
import { cn } from "../../lib/utils";

type RuleRow = {
  id?: string;
  productCategory: ProductCategoryKey;
  policyStatus: string;
  deductibleType: string;
  ageCondition: string;
  commissionPercent: number;
};

const AGE_BANDS = ["LESS_THAN_60", "GREATER_THAN_60"] as const;

function ruleKey(
  category: string,
  status: string,
  deductible: string,
  age: string
) {
  return `${category}|${status}|${deductible}|${age}`;
}

const CommissionRulePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [percentByLeaf, setPercentByLeaf] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(COMMISSION_CATEGORY_TREE.map((c) => c.category))
  );

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/v1/commission-rules`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );
      const rules: RuleRow[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      const map: Record<string, string> = {};
      for (const tree of COMMISSION_CATEGORY_TREE) {
        for (const branch of tree.branches) {
          for (const leaf of branch.leaves) {
            const match = rules.find(
              (r) =>
                r.productCategory === leaf.productCategory &&
                r.policyStatus === leaf.policyStatus &&
                r.deductibleType === leaf.deductibleType
            );
            if (match) {
              map[leaf.key] = String(match.commissionPercent);
            }
          }
        }
      }
      setPercentByLeaf(map);
    } catch {
      toast.error("Failed to load commission rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const rules: Array<{
        productCategory: ProductCategoryKey;
        policyStatus: string;
        deductibleType: string;
        commissionPercent: number;
      }> = [];

      for (const tree of COMMISSION_CATEGORY_TREE) {
        for (const branch of tree.branches) {
          for (const leaf of branch.leaves) {
            const raw = percentByLeaf[leaf.key];
            if (raw === undefined || raw === "") continue;
            const pct = parseFloat(raw);
            if (isNaN(pct) || pct < 0) {
              toast.error(`Invalid % for ${PRODUCT_CATEGORY_LABELS[tree.category]} — ${leaf.label}`);
              setSaving(false);
              return;
            }
            rules.push({
              productCategory: leaf.productCategory,
              policyStatus: leaf.policyStatus,
              deductibleType: leaf.deductibleType,
              commissionPercent: pct,
            });
          }
        }
      }

      await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/v1/commission-rules/bulk-upsert`,
        { rules },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );
      toast.success("Commission rules saved");
      fetchRules();
    } catch {
      toast.error("Failed to save commission rules");
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Commission Master</h1>
          <p className="text-sm text-gray-500 mt-1">
            Set commission % by product category, status, and sub-category. Applies to both age bands.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save all
        </Button>
      </div>

      <div className="space-y-3">
        {COMMISSION_CATEGORY_TREE.map((tree) => {
          const isOpen = expanded.has(tree.category);
          return (
            <Card key={tree.category} className="border border-gray-200 shadow-sm">
              <CardHeader
                className="py-3 px-4 cursor-pointer hover:bg-gray-50/80"
                onClick={() => toggleCategory(tree.category)}
              >
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <CardTitle className="text-base font-semibold">
                    {PRODUCT_CATEGORY_LABELS[tree.category]}
                  </CardTitle>
                </div>
              </CardHeader>
              {isOpen && (
                <CardContent className="pt-0 pb-4 px-4 space-y-4">
                  {tree.branches.map((branch) => (
                    <div key={`${tree.category}-${branch.statusLabel}`} className="border-l-2 border-gray-200 pl-4">
                      <p className="text-xs font-medium text-gray-600 mb-2">{branch.statusLabel}</p>
                      <div className="space-y-2">
                        {branch.leaves.map((leaf) => (
                          <div
                            key={leaf.key}
                            className={cn(
                              "flex items-center justify-between gap-4 py-2 px-3 rounded-md bg-gray-50/80"
                            )}
                          >
                            <span className="text-sm text-gray-800">{leaf.label}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                className="w-24 h-9 text-right"
                                placeholder="0"
                                value={percentByLeaf[leaf.key] ?? ""}
                                onChange={(e) =>
                                  setPercentByLeaf((prev) => ({
                                    ...prev,
                                    [leaf.key]: e.target.value,
                                  }))
                                }
                              />
                              <span className="text-sm text-gray-500">%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CommissionRulePage;
