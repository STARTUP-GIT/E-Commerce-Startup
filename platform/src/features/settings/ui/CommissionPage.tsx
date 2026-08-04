"use client";

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Percent, Plus, Trash2 } from 'lucide-react';

interface CommissionForm {
  defaultRate: number;
  maxRate: number;
  rules: { category: string; rate: number }[];
}

export function CommissionPage() {
  const { settings, isLoading, updateCommission } = useSettings();
  const form = useForm<CommissionForm>({
    defaultValues: { defaultRate: 10, maxRate: 30, rules: [] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'rules' });

  React.useEffect(() => {
    if (settings) {
      form.reset({
        defaultRate: settings.commission.defaultRate,
        maxRate: settings.commission.maxRate,
        rules: settings.commission.rules || [],
      });
    }
  }, [settings, form]);

  if (isLoading || !settings) {
    return <Skeleton className="h-72 w-full" />;
  }

  const handleSubmit = async (values: CommissionForm) => {
    await updateCommission(values);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Commission Engine"
        description="Platform fees charged on every seller transaction."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-white/60" />
              Commission Rules
            </CardTitle>
            <CardDescription>Category-level overrides on top of the default rate.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    Default Rate (%)
                  </label>
                  <Input type="number" step="0.1" {...form.register('defaultRate', { valueAsNumber: true })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    Max Rate (%)
                  </label>
                  <Input type="number" step="0.1" {...form.register('maxRate', { valueAsNumber: true })} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Category Rules</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => append({ category: '', rate: 0 })}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Rule
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <div className="p-6 text-center rounded-xl border border-dashed border-white/10">
                    <p className="text-xs text-white/40">No category rules. All categories use the default rate.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-3">
                        <Input
                          placeholder="Category (e.g. Electronics)"
                          {...form.register(`rules.${index}.category`)}
                        />
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Rate %"
                          className="w-28"
                          {...form.register(`rules.${index}.rate`, { valueAsNumber: true })}
                        />
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit">Save Commission Config</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commission Summary</CardTitle>
            <CardDescription>Current effective rates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Stat label="Default Rate" value={`${settings.commission.defaultRate}%`} />
            <Stat label="Maximum Rate" value={`${settings.commission.maxRate}%`} />
            <Stat label="Category Rules" value={`${settings.commission.rules?.length ?? 0}`} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-black text-white">{value}</span>
    </div>
  );
}
