-- Create fees table for managing student fees
CREATE TABLE IF NOT EXISTS fees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_fees_student_id ON fees(student_id);
CREATE INDEX idx_fees_teacher_id ON fees(teacher_id);
CREATE INDEX idx_fees_status ON fees(status);

-- Enable Row Level Security (RLS)
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;

-- Create policies for fees table
CREATE POLICY "Teachers can view their own fees" ON fees
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own fees" ON fees
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own fees" ON fees
  FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own fees" ON fees
  FOR DELETE USING (auth.uid() = teacher_id);
