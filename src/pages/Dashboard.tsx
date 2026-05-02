import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ClipboardCheck, FileText, Megaphone } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  const { data: studentCount = 0 } = useQuery({
    queryKey: ['student-count'],
    queryFn: async () => {
      const { count } = await supabase.from('students').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const { data: todayAttendance = 0 } = useQuery({
    queryKey: ['today-attendance'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'present');
      return count ?? 0;
    },
  });

  const { data: examCount = 0 } = useQuery({
    queryKey: ['exam-count'],
    queryFn: async () => {
      const { count } = await supabase.from('exams').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const { data: announcementCount = 0 } = useQuery({
    queryKey: ['announcement-count'],
    queryFn: async () => {
      const { count } = await supabase.from('announcements').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const stats = [
    { label: 'Total Students', value: studentCount, icon: Users, color: 'gradient-primary' },
    { label: 'Present Today', value: todayAttendance, icon: ClipboardCheck, color: 'gradient-accent' },
    { label: 'Total Exams', value: examCount, icon: FileText, color: 'gradient-primary' },
    { label: 'Announcements', value: announcementCount, icon: Megaphone, color: 'gradient-accent' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Card key={stat.label} className="glass-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-heading font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12 text-xs text-muted-foreground space-y-1">
        <p>Powered by <span className="font-semibold text-foreground">Maheshwari Tech</span></p>
        <p>Proudly Made in India ❤️</p>
      </div>
    </div>
  );
};

export default Dashboard;
