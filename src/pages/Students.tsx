import { useState, useRef, type ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { exportToExcel, parseExcelFile } from '@/lib/excel';
import { Plus, Trash2, Edit2, MessageCircle, Download, Upload } from 'lucide-react';

const Students = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', whatsapp_number: '', class: '', roll_number: '' });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from('students').update(form).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('students').insert({ ...form, teacher_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-count'] });
      setOpen(false);
      resetForm();
      toast({ title: editingId ? 'Student updated!' : 'Student added!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-count'] });
      toast({ title: 'Student deleted' });
    },
  });

  const importInputRef = useRef<HTMLInputElement | null>(null);

  const resetForm = () => {
    setForm({ name: '', phone: '', whatsapp_number: '', class: '', roll_number: '' });
    setEditingId(null);
  };

  const handleEdit = (s: any) => {
    setForm({ name: s.name, phone: s.phone || '', whatsapp_number: s.whatsapp_number || '', class: s.class || '', roll_number: s.roll_number || '' });
    setEditingId(s.id);
    setOpen(true);
  };

  const exportStudents = () => {
    if (students.length === 0) return;

    exportToExcel([
      {
        name: 'Students',
        data: students.map((s: any) => ({
          Name: s.name,
          Class: s.class || '',
          'Roll No': s.roll_number || '',
          Phone: s.phone || '',
          WhatsApp: s.whatsapp_number || '',
        })),
      },
    ], `Students_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleStudentImport = async (file: File) => {
    try {
      const parsed = await parseExcelFile(file);
      const rows = parsed.map((row) => ({
        name: String(row.Name ?? row.name ?? '').trim(),
        phone: String(row.Phone ?? row.phone ?? '').trim(),
        whatsapp_number: String(row.WhatsApp ?? row.whatsapp_number ?? row.whatsapp ?? '').trim(),
        class: String(row.Class ?? row.class ?? '').trim(),
        roll_number: String(row['Roll No'] ?? row.roll_number ?? row.RollNumber ?? '').trim(),
        teacher_id: user!.id,
      })).filter((row) => row.name.length > 0);

      if (rows.length === 0) {
        throw new Error('No valid student rows found in the file.');
      }

      const { error } = await supabase.from('students').insert(rows);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-count'] });
      toast({ title: 'Students imported!', description: `${rows.length} rows added.` });
    } catch (e: any) {
      toast({ title: 'Import failed', description: e?.message || 'Unable to read the Excel file.', variant: 'destructive' });
    }
  };

  const handleStudentFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleStudentImport(file);
    e.target.value = '';
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground">{students.length} students enrolled</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={exportStudents} disabled={students.length === 0} className="gradient-primary text-primary-foreground">
            <Download className="w-4 h-4 mr-2" />Export Excel
          </Button>
          <Button onClick={() => importInputRef.current?.click()} variant="outline">
            <Upload className="w-4 h-4 mr-2" />Import Excel
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" />Add Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">{editingId ? 'Edit Student' : 'Add New Student'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                <Input placeholder="Full Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                <Input placeholder="Phone Number" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                <Input placeholder="WhatsApp Number" value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))} />
                <Input placeholder="Class" value={form.class} onChange={e => setForm(f => ({ ...f, class: e.target.value }))} />
                <Input placeholder="Roll Number" value={form.roll_number} onChange={e => setForm(f => ({ ...f, roll_number: e.target.value }))} />
                <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Add Student'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleStudentFileChange}
      />

      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Roll No</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : students.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No students yet. Add your first student!</TableCell></TableRow>
              ) : students.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.class || '-'}</TableCell>
                  <TableCell>{s.roll_number || '-'}</TableCell>
                  <TableCell>{s.phone || '-'}</TableCell>
                  <TableCell>
                    {s.whatsapp_number ? (
                      <a 
                        href={`https://wa.me/${s.whatsapp_number.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {s.whatsapp_number}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Students;
