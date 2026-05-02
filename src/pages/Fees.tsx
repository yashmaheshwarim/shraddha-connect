import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2 } from 'lucide-react';

const Fees = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ student_id: '', amount: '', due_date: '', status: 'pending', description: '' });
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: fees = [], isLoading } = useQuery({
    queryKey: ['fees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fees').select('*').order('due_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from('fees').update({
          student_id: form.student_id,
          amount: parseFloat(form.amount),
          due_date: form.due_date,
          status: form.status,
          description: form.description,
        }).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('fees').insert({
          student_id: form.student_id,
          amount: parseFloat(form.amount),
          due_date: form.due_date,
          status: form.status,
          description: form.description,
          teacher_id: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      setOpen(false);
      resetForm();
      toast({ title: editingId ? 'Fee updated!' : 'Fee added!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      toast({ title: 'Fee record deleted' });
    },
  });

  const resetForm = () => {
    setForm({ student_id: '', amount: '', due_date: '', status: 'pending', description: '' });
    setEditingId(null);
    setSelectedStudent(null);
  };

  const handleEdit = (f: any) => {
    const student = students.find(s => s.id === f.student_id);
    setSelectedStudent(student);
    setForm({ 
      student_id: f.student_id, 
      amount: f.amount.toString(), 
      due_date: f.due_date || '', 
      status: f.status || 'pending', 
      description: f.description || '' 
    });
    setEditingId(f.id);
    setOpen(true);
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.name || 'Unknown';
  };

  const getPendingTotal = () => {
    return fees
      .filter(f => f.status === 'pending')
      .reduce((sum, f) => sum + (f.amount || 0), 0);
  };

  const getCollectedTotal = () => {
    return fees
      .filter(f => f.status === 'paid')
      .reduce((sum, f) => sum + (f.amount || 0), 0);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Fees Management</h1>
          <p className="text-muted-foreground">Manage student fees and payments</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" />Add Fee</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">{editingId ? 'Edit Fee' : 'Add New Fee'}</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Student *</label>
                <select 
                  value={form.student_id} 
                  onChange={e => {
                    const student = students.find(s => s.id === e.target.value);
                    setSelectedStudent(student);
                    setForm(f => ({ ...f, student_id: e.target.value }));
                  }}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="">Select a student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.class || 'N/A'})</option>
                  ))}
                </select>
              </div>
              <Input 
                type="number" 
                placeholder="Amount *" 
                value={form.amount} 
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} 
                required 
                step="0.01"
              />
              <Input 
                type="date" 
                placeholder="Due Date" 
                value={form.due_date} 
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} 
              />
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <select 
                  value={form.status} 
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <Input 
                placeholder="Description" 
                value={form.description} 
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
              />
              <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Add Fee'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(fees.reduce((sum, f) => sum + (f.amount || 0), 0)).toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{getCollectedTotal().toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₹{getPendingTotal().toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : fees.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No fees recorded yet. Add your first fee!</TableCell></TableRow>
              ) : fees.map(f => {
                const student = students.find(s => s.id === f.student_id);
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{student?.name || 'Unknown'}</TableCell>
                    <TableCell>{student?.class || '-'}</TableCell>
                    <TableCell>₹{f.amount?.toFixed(2) || '0'}</TableCell>
                    <TableCell>{f.due_date ? new Date(f.due_date).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        f.status === 'paid' ? 'bg-green-100 text-green-700' :
                        f.status === 'overdue' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {f.status?.charAt(0).toUpperCase() + f.status?.slice(1) || 'Pending'}
                      </span>
                    </TableCell>
                    <TableCell>{f.description || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(f)}><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(f.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Fees;
