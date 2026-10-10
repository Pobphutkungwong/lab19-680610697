import { Router, type Response } from "express";
import {
  zStudentPostBody,
  zStudentId,
  zStudentPutBody,
} from "../libs/zodValidators.js";

import type { Student, CustomRequest } from "../libs/types.js";

// import authentication middleware
import {
  authenticateToken,
} from "../middlewares/authenMiddleware.js";
import { checkRoleAdmin } from "../middlewares/checkRoleAdminDBMiddleware.js";
import { checkRoles } from "../middlewares/checkRolesDBMiddleware.js";

// import database
import { PrismaClient } from "../../generated/prisma/index.js";
const prisma = new PrismaClient();

const router = Router();

// GET /api/v3/students
// get students (by program) with files
router.get(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      const students = await prisma.student.findMany({
        include: { files: true },
      });

      const program = req.query.program;
      if (program) {
        let filtered_students = students.filter(
          (student: any) => student.program === program,
        );
        return res.json({
          success: true,
          data: filtered_students,
        });
      } else {
        return res.json({
          success: true,
          data: students,
        });
      }
    } catch (err) {
      return res.json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// GET /api/v3/students/{studentId}
router.get(
  "/:studentId",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;

      const studentId = req.params.studentId as string;
      const result = zStudentId.safeParse(studentId);
      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      let found_student = null;
      if (studentId) {
        found_student = await prisma.student.findUnique({
          where: { studentId: studentId },
        });
      }

      if (!found_student) {
        return res.status(404).json({
          success: false,
          message: "Student does not exists",
        });
      }

      if (
        user?.role === "STUDENT" &&
        found_student.studentId !== user.studentId
      ) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      res.json({
        success: true,
        data: found_student,
      });
    } catch (err) {
      return res.json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// POST /api/v3/students
router.post(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      const body = (await req.body) as Student;

      const result = zStudentPostBody.safeParse(body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const student = await prisma.student.findUnique({
        where: { studentId: result.data.studentId },
      });
      if (student) {
        return res.status(400).json({
          success: false,
          message: "The StudentID is already taken.",
        });
      }

      const { studentId, firstName, lastName, program, interests, emails } =
        result.data;
      const created = await prisma.student.create({
        data: {
          studentId,
          firstName,
          lastName,
          program,
          interests,
          emails,
        },
      });

      res.set("Link", `/api/v3/students/${created.studentId}`);

      return res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Somthing is wrong, please try again",
        error: err,
      });
    }
  },
);

// PUT /api/v3/students
router.put("/", authenticateToken, async (req: CustomRequest, res: Response) => {
  try {
    const body = await req.body;
    const user = req.user;

    const result = zStudentPutBody.safeParse(body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues[0]?.message,
      });
    }

    const student = await prisma.student.findUnique({
      where: { studentId: result.data.studentId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student does not exists",
      });
    }

    if (user?.role !== "ADMIN" && user?.studentId !== result.data.studentId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden access",
      });
    }

    const updatedStd = await prisma.student.update({
      where: {
        studentId: result.data.studentId,
      },
      data: {
        ...(result.data.firstName && { firstName: result.data.firstName }),
        ...(result.data.lastName && { lastName: result.data.lastName }),
        ...(result.data.program && { program: result.data.program }),
        ...(result.data.interests && { interests: result.data.interests }),
        ...(result.data.emails && { emails: result.data.emails }),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Update Student Success",
      data: updatedStd,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Somthing is wrong, please try again",
      error: err,
    });
  }
});

// DELETE /api/v3/students
router.delete(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      const body = req.body as { studentId: string };

      if (!body?.studentId) {
        return res.status(400).json({
          success: false,
          message: "studentId is required",
        });
      }

      const student = await prisma.student.findUnique({
        where: { studentId: body.studentId },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student does not exists",
        });
      }

      const [, , deletedStudent] = await prisma.$transaction([
        prisma.enrollment.deleteMany({ where: { studentId: body.studentId } }),
        prisma.file.deleteMany({ where: { studentId: body.studentId } }),
        prisma.student.delete({ where: { studentId: body.studentId } }),
      ]);

      return res.status(200).json({
        success: true,
        message: "Delete Student Success",
        data: deletedStudent,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Somthing is wrong, please try again",
        error: err,
      });
    }
  },
);

export default router;