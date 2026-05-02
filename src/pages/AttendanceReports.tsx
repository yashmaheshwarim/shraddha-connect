import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Download, Users, CheckCircle, XCircle, Clock, BarChart3 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const AttendanceReports = () => {
  const { user } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  const monthNum = parseInt(selectedMonth);
  const yearNum = parseInt(selectedYear);
  const startDate = `${yearNum}-${String(monthNum + 1).padStart(2, '0')}-01`;
  const endDate = monthNum === 11
    ? `${yearNum + 1}-01-01`
    : `${yearNum}-${String(monthNum + 2).padStart(2, '0')}-01`;

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance-report', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate)
        .lt('date', endDate);
      if (error) throw error;
      return data;
    },
  });

  const report = useMemo(() => {
    return students.map(s => {
      const records = attendance.filter(a => a.student_id === s.id);
      const total = records.length;
      const present = records.filter(a => a.status === 'present').length;
      const absent = records.filter(a => a.status === 'absent').length;
      const late = records.filter(a => a.status === 'late').length;
      const percentage = total > 0 ? Math.round((present + late) / total * 100) : 0;
      return { ...s, total, present, absent, late, percentage };
    });
  }, [students, attendance]);

  const summary = useMemo(() => {
    const totalRecords = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;
    const lateCount = attendance.filter(a => a.status === 'late').length;
    const avgPercentage = report.length > 0
      ? Math.round(report.reduce((sum, r) => sum + r.percentage, 0) / report.length)
      : 0;
    return { totalRecords, presentCount, absentCount, lateCount, avgPercentage };
  }, [attendance, report]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Shraddha Group Tuition', 14, 20);
    doc.setFontSize(12);
    doc.text(`Attendance Report - ${months[monthNum]} ${yearNum}`, 14, 30);
    doc.setFontSize(10);
    doc.text(`Average Attendance: ${summary.avgPercentage}%`, 14, 38);

    autoTable(doc, {
      startY: 45,
      head: [['#', 'Student', 'Class', 'Present', 'Absent', 'Late', 'Total', '%']],
      body: report.map((r, i) => [
        i + 1,
        r.name,
        r.class || '-',
        r.present,
        r.absent,
        r.late,
        r.total,
        `${r.percentage}%`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 },
    });

    doc.save(`Attendance_${months[monthNum]}_${yearNum}.pdf`);
  };

  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i));

  const getPercentageColor = (pct: number) => {
    if (pct >= 75) return 'text-success';
    if (pct >= 50) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Attendance Reports</h1>
          <p className="text-muted-foreground">Monthly summaries & student-wise analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={downloadPDF} disabled={report.length === 0} className="gradient-primary text-primary-foreground">
            <Download className="w-4 h-4 mr-2" />PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Avg Attendance', value: `${summary.avgPercentage}%`, icon: BarChart3, color: 'gradient-primary' },
          { label: 'Total Records', value: summary.totalRecords, icon: Users, color: 'gradient-accent' },
          { label: 'Present', value: summary.presentCount, icon: CheckCircle, color: 'gradient-accent' },
          { label: 'Absent', value: summary.absentCount, icon: XCircle, color: 'gradient-primary' },
          { label: 'Late', value: summary.lateCount, icon: Clock, color: 'gradient-primary' },
        ].map(stat => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center shrink-0`}>
                <stat.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-heading font-bold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Student-wise</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card className="glass-card">
            <CardContent className="p-0">
              {report.length === 0 ? (
                <p className="p-8 text-center text-muted-foreground">No attendance data for this period.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Late</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead>Attendance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.map((r, i) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.class || '-'}</TableCell>
                        <TableCell className="text-center text-success font-medium">{r.present}</TableCell>
                        <TableCell className="text-center text-destructive font-medium">{r.absent}</TableCell>
                        <TableCell className="text-center text-warning font-medium">{r.late}</TableCell>
                        <TableCell className="text-center">{r.total}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={r.percentage} className="h-2 w-20" />
                            <span className={`text-sm font-bold ${getPercentageColor(r.percentage)}`}>
                              {r.percentage}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Attendees */}
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">🏆 Top Attendance</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[...report].sort((a, b) => b.percentage - a.percentage).slice(0, 5).map((r, i) => (
                  <div key={r.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                      <span className="text-sm font-medium">{r.name}</span>
                    </div>
                    <span className={`text-sm font-bold ${getPercentageColor(r.percentage)}`}>{r.percentage}%</span>
                  </div>
                ))}
                {report.length === 0 && <p className="text-sm text-muted-foreground">No data</p>}
              </CardContent>
            </Card>

            {/* Low Attendees */}
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">⚠️ Low Attendance</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[...report].filter(r => r.percentage < 75 && r.total > 0).sort((a, b) => a.percentage - b.percentage).slice(0, 5).map((r, i) => (
                  <div key={r.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                      <span className="text-sm font-medium">{r.name}</span>
                    </div>
                    <span className={`text-sm font-bold ${getPercentageColor(r.percentage)}`}>{r.percentage}%</span>
                  </div>
                ))}
                {report.filter(r => r.percentage < 75 && r.total > 0).length === 0 && (
                  <p className="text-sm text-muted-foreground">All students have good attendance! 🎉</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceReports;
