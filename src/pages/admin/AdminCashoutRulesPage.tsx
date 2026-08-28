import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchAllCashoutRules, createCashoutRule, updateCashoutRule, deleteCashoutRule, fetchCashoutTerms, saveCashoutTerms } from "@/services/cashoutRules"
import type { CashoutRule } from "@/services/cashoutRules"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Loader2, X, ShieldCheck, Save } from "lucide-react"
import { cn } from "@/lib/utils"

const emptyForm: Omit<CashoutRule, "id" | "created_at" | "updated_at"> = {
  deposit_min: 0,
  deposit_max: 0,
  min_type: "fixed",
  min_fixed: null,
  min_multiplier: null,
  max_multiplier: 12,
  sort_order: 0,
  is_active: true,
}

export default function AdminCashoutRulesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm, min_fixed: 60, min_multiplier: 3 })
  const [terms, setTerms] = useState("")
  const [editingTerms, setEditingTerms] = useState(false)

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["admin-cashout-rules"],
    queryFn: fetchAllCashoutRules,
  })

  const { data: savedTerms = "" } = useQuery<string>({
    queryKey: ["cashout-terms"],
    queryFn: fetchCashoutTerms,
  })

  // Sync terms state when data loads
  useEffect(() => {
    if (savedTerms) setTerms(savedTerms)
  }, [savedTerms])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        deposit_min: Number(form.deposit_min),
        deposit_max: Number(form.deposit_max),
        min_type: form.min_type,
        min_fixed: form.min_type === "fixed" ? Number(form.min_fixed) : null,
        min_multiplier: form.min_type === "multiplier" ? Number(form.min_multiplier) : null,
        max_multiplier: Number(form.max_multiplier),
        sort_order: Number(form.sort_order),
        is_active: form.is_active,
      }
      if (editingId) return updateCashoutRule(editingId, payload)
      return createCashoutRule(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cashout-rules"] })
      qc.invalidateQueries({ queryKey: ["cashout-rules"] })
      toast.success(editingId ? "Rule updated!" : "Rule created!")
      resetForm()
    },
    onError: (err: any) => toast.error(err.message || "Failed to save"),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCashoutRule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cashout-rules"] })
      qc.invalidateQueries({ queryKey: ["cashout-rules"] })
      toast.success("Rule deleted")
    },
    onError: (err: any) => toast.error(err.message),
  })

  const termsMutation = useMutation({
    mutationFn: () => saveCashoutTerms(terms),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cashout-terms"] })
      toast.success("Terms & Conditions saved!")
      setEditingTerms(false)
    },
    onError: (err: any) => toast.error(err.message),
  })

  function resetForm() {
    setForm({ ...emptyForm, min_fixed: 60, min_multiplier: 3 })
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(rule: CashoutRule) {
    setForm({
      deposit_min: rule.deposit_min,
      deposit_max: rule.deposit_max,
      min_type: rule.min_type,
      min_fixed: rule.min_fixed ?? 60,
      min_multiplier: rule.min_multiplier ?? 3,
      max_multiplier: rule.max_multiplier,
      sort_order: rule.sort_order,
      is_active: rule.is_active,
    })
    setEditingId(rule.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-neon-green" /> Cashout Rules
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Define min/max cashout limits based on customer deposit ranges</p>
        </div>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-neon px-4 py-2 flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" /> Add Rule
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-white text-lg">{editingId ? "Edit Rule" : "New Rule"}</h2>
            <button onClick={resetForm} className="text-muted-foreground hover:text-white"><X className="h-5 w-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Deposit Min ($)</label>
                  <input type="number" value={form.deposit_min} onChange={e => setForm(f => ({ ...f, deposit_min: Number(e.target.value) }))} className="game-input w-full" min={0} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Deposit Max ($)</label>
                  <input type="number" value={form.deposit_max} onChange={e => setForm(f => ({ ...f, deposit_max: Number(e.target.value) }))} className="game-input w-full" min={0} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Minimum Cashout Type</label>
                <select value={form.min_type} onChange={e => setForm(f => ({ ...f, min_type: e.target.value as any }))} className="game-input w-full">
                  <option value="fixed">Fixed Amount</option>
                  <option value="multiplier">Deposit × Multiplier</option>
                </select>
              </div>

              {form.min_type === "fixed" ? (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Fixed Minimum Amount ($)</label>
                  <input type="number" value={form.min_fixed ?? ""} onChange={e => setForm(f => ({ ...f, min_fixed: Number(e.target.value) }))} className="game-input w-full" min={0} placeholder="e.g. 60" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Minimum Multiplier (Deposit × ?)</label>
                  <input type="number" value={form.min_multiplier ?? ""} onChange={e => setForm(f => ({ ...f, min_multiplier: Number(e.target.value) }))} className="game-input w-full" min={1} step={0.5} placeholder="e.g. 3" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Maximum Multiplier (Deposit × ?)</label>
                <input type="number" value={form.max_multiplier} onChange={e => setForm(f => ({ ...f, max_multiplier: Number(e.target.value) }))} className="game-input w-full" min={1} step={0.5} />
                <p className="text-xs text-muted-foreground mt-1">Maximum = Customer''s Total Deposit × this value</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Sort Order</label>
                <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="game-input w-full" min={0} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-border">
                <div>
                  <p className="text-sm font-semibold text-white">Active</p>
                  <p className="text-xs text-muted-foreground">Apply this rule for cashouts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-green" />
                </label>
              </div>

              {/* Preview */}
              <div className="p-3 rounded-xl bg-neon-green/5 border border-neon-green/20 text-xs">
                <p className="text-neon-green font-semibold mb-1">Preview:</p>
                <p className="text-muted-foreground">Loaded <span className="text-white">${form.deposit_min} - ${form.deposit_max}</span></p>
                <p className="text-muted-foreground">Min: <span className="text-neon-green">{form.min_type === "fixed" ? `$${form.min_fixed || 0}` : `Dep × ${form.min_multiplier || 1}`}</span></p>
                <p className="text-muted-foreground">Max: <span className="text-neon-gold">Dep × {form.max_multiplier}</span></p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-neon px-6 py-2 flex items-center gap-2">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? "Update Rule" : "Create Rule"}
            </button>
            <button onClick={resetForm} className="btn-secondary px-4 py-2">Cancel</button>
          </div>
        </div>
      )}

      {/* Rules Table */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-4">All Rules ({rules.length})</h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No rules yet. Add one above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-3 pr-4">Deposit Range</th>
                  <th className="pb-3 pr-4">Minimum</th>
                  <th className="pb-3 pr-4">Maximum</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rules.map(rule => (
                  <tr key={rule.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 pr-4 font-semibold text-white">${rule.deposit_min} - ${rule.deposit_max}</td>
                    <td className="py-3 pr-4 text-neon-green font-medium">
                      {rule.min_type === "fixed" ? `$${rule.min_fixed}` : `Dep × ${rule.min_multiplier}`}
                    </td>
                    <td className="py-3 pr-4 text-neon-gold font-medium">Dep × {rule.max_multiplier}</td>
                    <td className="py-3 pr-4">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border", rule.is_active ? "bg-neon-green/20 text-neon-green border-neon-green/30" : "bg-muted/30 text-muted-foreground border-border")}>
                        {rule.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(rule)} className="h-7 w-7 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => { if (confirm(`Delete this rule ($${rule.deposit_min}-$${rule.deposit_max})?`)) deleteMutation.mutate(rule.id) }} className="h-7 w-7 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Terms & Conditions */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Terms & Conditions</h2>
          {!editingTerms ? (
            <button onClick={() => { setTerms(savedTerms); setEditingTerms(true) }} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => termsMutation.mutate()} disabled={termsMutation.isPending} className="btn-neon px-4 py-1.5 text-xs flex items-center gap-1.5">
                {termsMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
              </button>
              <button onClick={() => setEditingTerms(false)} className="text-xs text-muted-foreground hover:text-white px-2">Cancel</button>
            </div>
          )}
        </div>
        {editingTerms ? (
          <textarea value={terms} onChange={e => setTerms(e.target.value)} className="game-input w-full min-h-[140px] text-sm resize-y" placeholder="Enter terms & conditions. One condition per line (start with • or -)." />
        ) : savedTerms ? (
          <div className="space-y-1">
            {String(savedTerms).split(/\\n|\n/).filter(line => line.trim()).map((line: string, i: number) => (
              <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{line.replace(/^[•\-\s]+/, '')}</span>
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No terms set. Click Edit to add.</p>
        )}
      </div>
    </div>
  )
}
