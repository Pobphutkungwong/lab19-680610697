import { Router, type Request, type Response } from "express";
import { zEnrollmentBody, zEnrollmentPutBody } from "../libs/zodValidators.ts";

import type { CustomRequest } from "../libs/types.ts";

// import authentication middleware
import { authenticateToken } from "../middlewares/authenMiddleware.ts";
import { checkRoles } from "../middlewares/checkRolesDBMiddleware.ts";

// import database
import { PrismaClient } from "../../generated/prisma/client.ts";
const prisma = new PrismaClient();

const router = Router();

// GET /api/v3/enrollments
// ADMIN: get all enrollments, STUDENT: get only his own enrollments
router.get(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      const enrollments = await prisma.enrollment.findMany({
        where:
          user?.role === "STUDENT" ? { studentId: user.studentId ?? "" } : {},
        orderBy: { createdAt: "asc" },
      });

      return res.json({
        success: true,
        data: enrollments,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// POST /api/v3/enrollments, body = {studentId, courseId}
// ADMIN: enroll any student, STUDENT: enroll only himself
router.post(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const result = zEnrollmentBody.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }
      const { studentId, courseId } = result.data;

      const user = req.user;
      if (user?.role === "STUDENT" && studentId !== user.studentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      const student = await prisma.student.findUnique({
        where: { studentId },
      });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: `Student ${studentId} does not exists`,
        });
      }
      const course = await prisma.course.findUnique({ where: { courseId } });
      if (!course) {
        return res.status(404).json({
          success: false,
          message: `Course ${courseId} does not exists`,
        });
      }

      const enrolled = await prisma.enrollment.findFirst({
        where: { studentId, courseId },
      });
      if (enrolled) {
        return res.status(409).json({
          success: false,
          message: `Student ${studentId} has already enrolled in ${courseId}`,
        });
      }

      const created = await prisma.enrollment.create({
        data: { studentId, courseId },
      });

      return res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// TODO การบ้าน 2.1: PUT /api/v3/enrollments, body = {studentId, courseId, newCourseId}
//   เปลี่ยนวิชาที่ลงทะเบียนไว้ (courseId → newCourseId)
//   - ADMIN แก้ได้ทุกคน / STUDENT แก้ได้แค่ของตัวเอง (403)
//   - validate body (400), ยังไม่ได้ลงวิชาเดิม (404), วิชาใหม่ = วิชาเดิม (400),
//     วิชาใหม่ไม่มีจริง (404), ลงวิชาใหม่ไว้แล้ว (409)
router.put(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const result = zEnrollmentPutBody.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }
      const { studentId, courseId, newCourseId } = result.data;

      const user = req.user;
      if (user?.role === "STUDENT" && studentId !== user.studentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId, courseId },
      });
      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: `Student ${studentId} has not enrolled in ${courseId}`,
        });
      }

      if (newCourseId === courseId) {
        return res.status(400).json({
          success: false,
          message: "New course must be different from the current course",
        });
      }

      const newCourse = await prisma.course.findUnique({
        where: { courseId: newCourseId },
      });
      if (!newCourse) {
        return res.status(404).json({
          success: false,
          message: `Course ${newCourseId} does not exists`,
        });
      }

      const duplicated = await prisma.enrollment.findFirst({
        where: { studentId, courseId: newCourseId },
      });
      if (duplicated) {
        return res.status(409).json({
          success: false,
          message: `Student ${studentId} has already enrolled in ${newCourseId}`,
        });
      }

      const updated = await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { courseId: newCourseId },
      });

      return res.status(200).json({
        success: true,
        message: `Student ${studentId} changed from ${courseId} to ${newCourseId}`,
        data: updated,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// TODO การบ้าน 2.2: DELETE /api/v3/enrollments, body = {studentId, courseId}
//   ยกเลิกการลงทะเบียน (drop)
//   - ADMIN ลบได้ทุกคน / STUDENT ลบได้แค่ของตัวเอง (403)
//   - validate body (400), ไม่พบการลงทะเบียน (404)

router.delete(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const result = zEnrollmentBody.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }
      const { studentId, courseId } = result.data;

      const user = req.user;
      if (user?.role === "STUDENT" && studentId !== user.studentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId, courseId },
      });
      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: `Student ${studentId} has not enrolled in ${courseId}`,
        });
      }

      const deleted = await prisma.enrollment.delete({
        where: { id: enrollment.id },
      });

      return res.status(200).json({
        success: true,
        message: `Student ${studentId} dropped ${courseId}`,
        data: deleted,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

router.put("/", checkAuthen, async (req: Request, res: Response) => {
  try {
    const parseResult = zEnrollmentPutBody.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, message: "Validation error" });
    }

    const { studentId, courseId, newCourseId } = parseResult.data;
    const user = (req as any).user;

    if (user.role !== "ADMIN" && user.studentId !== studentId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (courseId === newCourseId) {
      return res.status(400).json({ success: false, message: "New course must be different from current course" });
    }

    const currentEnrollment = await prisma.enrollment.findFirst({ where: { studentId, courseId } });
    if (!currentEnrollment) {
      return res.status(404).json({ success: false, message: "Current enrollment not found" });
    }

    const newCourse = await prisma.course.findUnique({ where: { courseId: newCourseId } });
    if (!newCourse) {
      return res.status(404).json({ success: false, message: "New course not found" });
    }

    const duplicateEnrollment = await prisma.enrollment.findFirst({ where: { studentId, courseId: newCourseId } });
    if (duplicateEnrollment) {
      return res.status(409).json({ success: false, message: "Already enrolled in this course" });
    }

    const updated = await prisma.enrollment.update({
      where: { id: currentEnrollment.id },
      data: { courseId: newCourseId },
    });

    return res.status(200).json({ success: true, message: "Enrollment updated successfully", data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/", checkAuthen, async (req: Request, res: Response) => {
  try {
    const { studentId, courseId } = req.body;
    const user = (req as any).user;

    if (user.role !== "ADMIN" && user.studentId !== studentId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const enrollment = await prisma.enrollment.findFirst({ where: { studentId, courseId } });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: "Enrollment not found" });
    }

    await prisma.enrollment.delete({ where: { id: enrollment.id } });

    return res.status(200).json({ success: true, message: "Enrollment deleted successfully", data: enrollment });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;