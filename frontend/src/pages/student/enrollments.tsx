import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useEnrollmentStore } from "@/lib/enrollment-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function StudentEnrollmentsPage() {
  const authStore = useAuthStore() as any;
  // ดึง user จาก authStore (รองรับทั้ง user, authUser, student)
  const user = authStore.user || authStore.authUser || authStore.student;

  const {
    courses,
    enrollments,
    getAll,
    updateEnrollment,
    dropEnrollment,
  } = useEnrollmentStore();

  const [open, setOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      getAll(user.role, user.studentId);
    }
  }, [user, getAll]);

  const studentId = user?.studentId;

  // รายชื่อวิชาที่นักศึกษาคนนี้ลงทะเบียนไว้แล้ว
  const myEnrollments = enrollments.filter((e) => e.studentId === studentId);
  const enrolledCourseIds = new Set(myEnrollments.map((e) => e.courseId));

  // วิชาที่ยังไม่ได้ลงทะเบียน (สำหรับเปลี่ยนวิชา)
  const availableCourses = courses.filter((c) => !enrolledCourseIds.has(c.courseId));

  const handleOpenDialog = (courseId: string) => {
    setSelectedCourseId(courseId);
    setNewCourse("");
    setError(null);
    setOpen(true);
  };

  const handleUpdateEnrollment = async () => {
    if (!studentId || !selectedCourseId || !newCourse) return;
    try {
      setError(null);
      await updateEnrollment(studentId, selectedCourseId, newCourse);
      setOpen(false);
    } catch (err: any) {
      setError(err?.message || "เกิดข้อผิดพลาดในการเปลี่ยนวิชา");
    }
  };

  const handleDropEnrollment = async (courseId: string) => {
    if (!studentId) return;
    if (confirm(`คุณต้องการยกเลิกการลงทะเบียนวิชา ${courseId} ใช่หรือไม่?`)) {
      try {
        await dropEnrollment(studentId, courseId);
      } catch (err: any) {
        alert(err?.message || "เกิดข้อผิดพลาดในการยกเลิกวิชา");
      }
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">การลงทะเบียนเรียนของฉัน</h1>

      <Card>
        <CardHeader>
          <CardTitle>วิชาที่ลงทะเบียนแล้ว</CardTitle>
        </CardHeader>
        <CardContent>
          {myEnrollments.length === 0 ? (
            <p className="text-muted-foreground">ยังไม่มีรายการลงทะเบียน</p>
          ) : (
            <div className="space-y-4">
              {myEnrollments.map((e) => {
                const courseInfo = courses.find((c) => c.courseId === e.courseId);
                return (
                  <div
                    key={e.courseId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">
                        {e.courseId} - {courseInfo?.courseTitle || "ไม่พบชื่อวิชา"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ผู้สอน: {courseInfo?.instructors?.join(", ") || "-"}
                      </p>
                    </div>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(e.courseId)}
                      >
                        เปลี่ยนวิชา
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDropEnrollment(e.courseId)}
                      >
                        ถอนวิชา
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog เปลี่ยนวิชา */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เปลี่ยนวิชา {selectedCourseId}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            เลือกวิชาใหม่แทนวิชา {selectedCourseId} (เลือกได้เฉพาะวิชาที่ยังไม่ได้ลงทะเบียน)
          </p>

          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

          <Select value={newCourse} onValueChange={(val) => setNewCourse(val || "")}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกวิชาใหม่" />
            </SelectTrigger>
            <SelectContent>
              {availableCourses.map((c) => (
                <SelectItem key={c.courseId} value={c.courseId}>
                  {c.courseId} - {c.courseTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button disabled={!newCourse} onClick={handleUpdateEnrollment}>
              บันทึกการเปลี่ยนวิชา
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}