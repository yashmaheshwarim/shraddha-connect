import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Clock, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

type Status = 'present' | 'absent' | 'late';

const Attendance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: existing = [] } = useQuery({
    queryKey: ['attendance', date],
    queryFn: async () => {
      const { data, error } = await supabase.from('attendance').select('*').eq('date', date);
      if (error) throw error;
      return data;
    },
  });

  // Initialize statuses from existing records
  const getStatus = (studentId: string): Status => {
    if (statuses[studentId]) return statuses[studentId];
    const record = existing.find(a => a.student_id === studentId);
    return (record?.status as Status) || 'present';
  };

  const toggleStatus = (studentId: string) => {
    const current = getStatus(studentId);
    const next: Status = current === 'present' ? 'absent' : current === 'absent' ? 'late' : 'present';
    setStatuses(prev => ({ ...prev, [studentId]: next }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const records = students.map(s => ({
        student_id: s.id,
        teacher_id: user!.id,
        date,
        status: getStatus(s.id),
      }));

      for (const record of records) {
        const { error } = await supabase.from('attendance').upsert(record, { onConflict: 'student_id,date' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      toast({ title: 'Attendance saved!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const statusConfig = {
    present: { icon: Check, label: 'P', className: 'bg-success/10 text-success border-success/30' },
    absent: { icon: X, label: 'A', className: 'bg-destructive/10 text-destructive border-destructive/30' },
    late: { icon: Clock, label: 'L', className: 'bg-warning/10 text-warning border-warning/30' },
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Attendance</h1>
          <p className="text-muted-foreground">Mark daily attendance</p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="date" value={date} onChange={e => { setDate(e.target.value); setStatuses({}); }} className="w-auto" />
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || students.length === 0} className="gradient-primary text-primary-foreground">
            <Save className="w-4 h-4 mr-2" />{saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {students.length === 0 ? (
        <Card className="glass-card"><CardContent className="p-8 text-center text-muted-foreground">No students added yet. Add students first!</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map(s => {
            const status = getStatus(s.id);
            const config = statusConfig[status];
            return (
              <Card key={s.id} className={cn("glass-card cursor-pointer hover:shadow-md transition-all border-2", config.className)} onClick={() => toggleStatus(s.id)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.class || 'No class'} • {s.roll_number || 'No roll'}</p>
                  </div>
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2", config.className)}>
                    {config.label}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-success" /> Present</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-destructive" /> Absent</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-warning" /> Late</span>
        <span className="ml-auto">Tap a student to toggle</span>
      </div>
    </div>
  );
};

export default Attendance;
