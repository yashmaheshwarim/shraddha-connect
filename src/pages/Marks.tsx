import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Marks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [marksDialogOpen, setMarksDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [examForm, setExamForm] = useState({ name: '', subject: '', total_marks: '', date: new Date().toISOString().split('T')[0] });
  const [marksForm, setMarksForm] = useState<Record<string, string>>({});

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exams').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: marks = [] } = useQuery({
    queryKey: ['marks', selectedExam],
    queryFn: async () => {
      if (!selectedExam) return [];
      const { data, error } = await supabase.from('marks').select('*').eq('exam_id', selectedExam);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExam,
  });

  const createExamMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('exams').insert({
        ...examForm,
        total_marks: parseInt(examForm.total_marks),
        teacher_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['exam-count'] });
      setExamDialogOpen(false);
      setExamForm({ name: '', subject: '', total_marks: '', date: new Date().toISOString().split('T')[0] });
      toast({ title: 'Exam created!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const saveMarksMutation = useMutation({
    mutationFn: async () => {
      const records = Object.entries(marksForm)
        .filter(([_, v]) => v !== '')
        .map(([studentId, marksObtained]) => ({
          exam_id: selectedExam,
          student_id: studentId,
          teacher_id: user!.id,
          marks_obtained: parseInt(marksObtained),
        }));

      for (const record of records) {
        const { error } = await supabase.from('marks').upsert(record, { onConflict: 'exam_id,student_id' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marks'] });
      setMarksDialogOpen(false);
      toast({ title: 'Marks saved!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openMarksEntry = () => {
    const initial: Record<string, string> = {};
    students.forEach(s => {
      const existing = marks.find(m => m.student_id === s.id);
      initial[s.id] = existing ? String(existing.marks_obtained) : '';
    });
    setMarksForm(initial);
    setMarksDialogOpen(true);
  };

  const downloadPDF = () => {
    const exam = exams.find(e => e.id === selectedExam);
    if (!exam) return;

    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Shraddha Group Tuition', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Exam: ${exam.name} | Subject: ${exam.subject} | Date: ${exam.date}`, 105, 30, { align: 'center' });
    doc.text(`Total Marks: ${exam.total_marks}`, 105, 37, { align: 'center' });

    const tableData = students.map((s, i) => {
      const mark = marks.find(m => m.student_id === s.id);
      return [i + 1, s.name, s.roll_number || '-', s.class || '-', mark ? mark.marks_obtained : '-', exam.total_marks, mark ? `${((mark.marks_obtained / exam.total_marks) * 100).toFixed(1)}%` : '-'];
    });

    autoTable(doc, {
      startY: 45,
      head: [['#', 'Student Name', 'Roll No', 'Class', 'Marks', 'Total', '%']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 98, 204] },
    });

    doc.save(`${exam.name}_${exam.subject}_marks.pdf`);
    toast({ title: 'PDF downloaded!' });
  };

  const currentExam = exams.find(e => e.id === selectedExam);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Marks & Exams</h1>
          <p className="text-muted-foreground">Manage exam results</p>
        </div>
        <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" />New Exam</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">Create Exam</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); createExamMutation.mutate(); }} className="space-y-4">
              <Input placeholder="Exam Name *" value={examForm.name} onChange={e => setExamForm(f => ({ ...f, name: e.target.value }))} required />
              <Input placeholder="Subject *" value={examForm.subject} onChange={e => setExamForm(f => ({ ...f, subject: e.target.value }))} required />
              <Input type="number" placeholder="Total Marks *" value={examForm.total_marks} onChange={e => setExamForm(f => ({ ...f, total_marks: e.target.value }))} required />
              <Input type="date" value={examForm.date} onChange={e => setExamForm(f => ({ ...f, date: e.target.value }))} />
              <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={createExamMutation.isPending}>
                {createExamMutation.isPending ? 'Creating...' : 'Create Exam'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="Select an exam..." />
              </SelectTrigger>
              <SelectContent>
                {exams.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name} - {e.subject} ({e.date})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedExam && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={openMarksEntry}><FileText className="w-4 h-4 mr-2" />Enter Marks</Button>
                <Button variant="outline" onClick={downloadPDF}><Download className="w-4 h-4 mr-2" />Download PDF</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedExam && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading">{currentExam?.name} - {currentExam?.subject}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s, i) => {
                  const mark = marks.find(m => m.student_id === s.id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.roll_number || '-'}</TableCell>
                      <TableCell>{mark ? mark.marks_obtained : '-'}</TableCell>
                      <TableCell>{currentExam?.total_marks}</TableCell>
                      <TableCell>{mark ? `${((mark.marks_obtained / currentExam!.total_marks) * 100).toFixed(1)}%` : '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Marks Entry Dialog */}
      <Dialog open={marksDialogOpen} onOpenChange={setMarksDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">Enter Marks - {currentExam?.name}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMarksMutation.mutate(); }} className="space-y-3">
            {students.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm font-medium">{s.name}</span>
                <Input
                  type="number"
                  className="w-24"
                  placeholder="Marks"
                  min={0}
                  max={currentExam?.total_marks}
                  value={marksForm[s.id] || ''}
                  onChange={e => setMarksForm(f => ({ ...f, [s.id]: e.target.value }))}
                />
                <span className="text-sm text-muted-foreground">/ {currentExam?.total_marks}</span>
              </div>
            ))}
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={saveMarksMutation.isPending}>
              {saveMarksMutation.isPending ? 'Saving...' : 'Save Marks'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Marks;
