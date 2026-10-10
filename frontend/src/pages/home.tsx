import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth-store";

export default function HomePage() {
  const role = useAuthStore((s) => s.role);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>ระบบลงทะเบียนเรียน CPE & ISNE</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Lecture 18: เชื่อม Frontend (React) กับ Backend API (Express +
            Prisma + MongoDB)
          </p>
          {role === "ADMIN" ? (
            <div className="flex flex-wrap gap-2">
              <Button render={<Link to="/admin/students" />}>
                ไปหน้าจัดการนักศึกษา
              </Button>
              <Button variant="outline" render={<Link to="/admin/courses" />}>
                ไปหน้าจัดการวิชาเรียน
              </Button>
              <Button
                variant="outline"
                render={<Link to="/admin/enrollments" />}
              >
                ไปหน้าจัดการการลงทะเบียน
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button render={<Link to="/student/enrollments" />}>
                ไปหน้าจัดการการลงทะเบียน
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        จัดทำโดย พบพฤทธิ์ กุงวงศ์ 680610697
      </p>
    </div>
  );
}
