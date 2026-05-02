import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Send, MessageSquare, Clock } from 'lucide-react';

const Announcements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      // Get students with WhatsApp numbers
      const whatsappStudents = students.filter(s => s.whatsapp_number);

      if (whatsappStudents.length === 0) {
        throw new Error('No students have WhatsApp numbers. Please add WhatsApp numbers to students first.');
      }

      // Build WhatsApp Web URL for bulk messaging
      // Opens WhatsApp Web with pre-filled message for each student
      const encodedMsg = encodeURIComponent(message);

      // Open WhatsApp for all students
      whatsappStudents.forEach((student, index) => {
        const phone = student.whatsapp_number!.replace(/[^0-9]/g, '');
        const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;
        setTimeout(() => {
          window.open(`https://wa.me/${whatsappPhone}?text=${encodedMsg}`, '_blank');
        }, index * 500); // Stagger to avoid browser blocking
      });

      // Save announcement
      const { error } = await supabase.from('announcements').insert({
        teacher_id: user!.id,
        message,
        sent_to_count: whatsappStudents.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcement-count'] });
      setMessage('');
      toast({ title: 'WhatsApp messages opened!', description: 'Send the message in each WhatsApp tab.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const whatsappCount = students.filter(s => s.whatsapp_number).length;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-foreground">Announcements</h1>
        <p className="text-muted-foreground">Send announcements to students via WhatsApp</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-success" />
              Send via WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Type your announcement message here..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
            />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Will be sent to <span className="font-semibold text-foreground">{whatsappCount}</span> students with WhatsApp numbers
              </p>
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={!message.trim() || sendMutation.isPending || whatsappCount === 0}
                className="gradient-accent text-accent-foreground"
              >
                <Send className="w-4 h-4 mr-2" />
                {sendMutation.isPending ? 'Sending...' : `Send to ${whatsappCount} Students`}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 This will open WhatsApp Web tabs with pre-filled messages. You may need to allow pop-ups in your browser.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No announcements sent yet.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {announcements.map(a => (
                  <div key={a.id} className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-foreground">{a.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        Sent to {a.sent_to_count} students
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Announcements;
