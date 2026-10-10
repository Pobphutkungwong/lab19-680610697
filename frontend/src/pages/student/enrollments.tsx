import { useState } from "react";
import { PlusCircle, ArrowRightLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/lib/auth-store";
import { useEnrollmentStore } from "@/lib/enrollment-store";
import { ConfirmDeleteButton } from "@/components/confirm-button";

export default function StudentEnrollmentsPage() {
  const studentId = useAuthStore((s) => s.studentId);
  const { students, courses, enrollments, enroll, updateEnrollment, dropEnrollment } = useEnrollmentStore();

  const [open, setOpen] = useState(false);
  const [formCourse, setFormCourse] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [changingCourse, setChangingCourse] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState<string | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  const me = students.find((s) => s.studentId === studentId);
  const myEnrollments = enrollments.filter((e) => e.studentId === studentId);

  const courseOptions = courses
    .filter((c) => !myEnrollments.some((e) => e.courseId === c.courseId))
    .map((c) => ({
      value: c.courseId,
      label: `${c.courseId} — ${c.courseTitle}`,
    }));

  const courseOf = (courseId: string) =>
    courses.find((c) => c.courseId === courseId);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setFormCourse(null);
      setServerError(null);
    }
  };

  const handleEnroll = async () => {
    if (!studentId || !formCourse) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await enroll(studentId, formCourse);
      handleOpenChange(false);
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeDialogOpenChange = (next: boolean) => {
    if (!next) {
      setChangingCourse(null);
      setNewCourse(null);
      setChangeError(null);
    }
  };

  const handleChangeCourse = async () => {
    if (!studentId || !changingCourse || !newCourse) return;
    setChanging(true);
    setChangeError(null);
    try {
      await updateEnrollment(studentId, changingCourse, newCourse);
      handleChangeDialogOpenChange(false); // สำเร็จ → ปิดฟอร์ม
    } catch (err) {
      setChangeError((err as Error).message); // ถูกปฏิเสธ → แสดงใน Dialog ไม่ปิด
    } finally {
      setChanging(false);
    }
  };

  const handleDrop = async (courseId: string) => {
    if (!studentId) return;
    setDropError(null);
    try {
      await dropEnrollment(studentId, courseId);
    } catch (err) {
      setDropError((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">จัดการการลงทะเบียน</h1>
          <p className="text-sm text-muted-foreground">
            {me
              ? `${me.studentId} — ${me.firstName} ${me.lastName} (${me.program})`
              : (studentId ?? "-")}{" "}
            · ลงทะเบียนแล้ว {myEnrollments.length} วิชา
          </p>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button disabled={!studentId} />}>
            <PlusCircle className="h-4 w-4" />
            ลงทะเบียนเรียน
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>ลงทะเบียนเรียน</DialogTitle>
              <DialogDescription>
                เลือกวิชาที่ยังไม่ได้ลงทะเบียน
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
              <Label htmlFor="formCourse">วิชา</Label>
              <Select
                items={courseOptions}
                value={formCourse}
                onValueChange={(v) => setFormCourse(v as string)}
              >
                <SelectTrigger id="formCourse" className="w-full">
                  <SelectValue
                    placeholder={
                      courseOptions.length === 0
                        ? "ลงทะเบียนครบทุกวิชาแล้ว"
                        : "เลือกวิชา"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {courseOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}
            <DialogFooter>
              <Button
                disabled={!formCourse || submitting}
                onClick={handleEnroll}
              >
                <PlusCircle className="h-4 w-4" />
                {submitting ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {dropError && <p className="text-sm text-destructive">{dropError}</p>}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัสวิชา</TableHead>
              <TableHead>ชื่อวิชา</TableHead>
              <TableHead>ผู้สอน</TableHead>
              <TableHead>วันที่ลงทะเบียน</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myEnrollments.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-20 text-center text-muted-foreground"
                >
                  ยังไม่ได้ลงทะเบียนวิชาใด
                </TableCell>
              </TableRow>
            )}
            {myEnrollments.map((e) => {
              const course = courseOf(e.courseId);
              return (
                <TableRow key={e.courseId}>
                  <TableCell>{e.courseId}</TableCell>
                  <TableCell>{course?.courseTitle ?? "-"}</TableCell>
                  <TableCell>{course?.instructors.join(", ") || "-"}</TableCell>
                  <TableCell>
                    {e.enrolledAt
                      ? new Date(e.enrolledAt).toLocaleString("th-TH")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setChangingCourse(e.courseId)}
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                    <ConfirmDeleteButton
                      label={`ยกเลิกการลงทะเบียน ${e.courseId}`}
                      title="ยกเลิกการลงทะเบียน"
                      description={`ต้องการยกเลิกการลงทะเบียนวิชา ${e.courseId} — ${course?.courseTitle ?? ""} ใช่หรือไม่`}
                      onConfirm={() => handleDrop(e.courseId)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={changingCourse !== null}
        onOpenChange={handleChangeDialogOpenChange}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>เปลี่ยนวิชา</DialogTitle>
            <DialogDescription>
              เลือกวิชาใหม่แทนวิชา {changingCourse} (เลือกได้เฉพาะวิชาที่ยังไม่ได้ลงทะเบียน)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="newCourse">วิชาใหม่</Label>
            <Select
              items={courseOptions}
              value={newCourse}
              onValueChange={(v) => setNewCourse(v as string)}
            >
              <SelectTrigger id="newCourse" className="w-full">
                <SelectValue
                  placeholder={
                    courseOptions.length === 0
                      ? "ไม่มีวิชาที่เปลี่ยนได้"
                      : "เลือกวิชา"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {courseOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {changeError && (
            <p className="text-sm text-destructive">{changeError}</p>
          )}
          <DialogFooter>
            <Button
              disabled={!newCourse || changing}
              onClick={handleChangeCourse}
            >
              {changing ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}