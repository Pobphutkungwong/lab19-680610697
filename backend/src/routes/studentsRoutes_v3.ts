import { Router, type Request, type Response } from "express";
import { zStudentPostBody, zStudentId, zStudentPutBody } from "../libs/zodValidators.js";

import type { Student, CustomRequest } from "../libs/types.js";

// import authentication middleware
import { authenticateToken } from "../middlewares/authenMiddleware.ts";
import { checkRoleAdmin } from "../middlewares/checkRoleAdminDBMiddleware.ts";
import { checkRoles } from "../middlewares/checkRolesDBMiddleware.ts";

// import database
import { PrismaClient } from "../../generated/prisma/client.ts";
const prisma = new PrismaClient();

const router = Router();

// GET /api/v3/students
// get students (by program) with files

router.get(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: Request, res: Response) => {
    try {
      // get students from DB (with their files records)
      // const students = await prisma.student.findMany();
      const students = await prisma.student.findMany({
        include: { files: true },
      });

      // get program name from query string (if any)
      const program = req.query.program;
      if (program) {
        // filter students by program
        let filtered_students = students.filter(
          (student: any) => student.program === program,
        );
        return res.json({
          success: true,
          data: filtered_students,
        });
      } else {
        // return all students
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
      // get user, token from CustomRequest (token payload)
      const user = req.user;
      const token = req.token;

      // get parameterized variable: studentId
      const studentId = req.params.studentId as string;
      // validate studentId
      const result = zStudentId.safeParse(studentId);
      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      let found_student = null;
      if (studentId) {
        // get student from DB by studentId
        found_student = await prisma.student.findUnique({
          where: { studentId: studentId },
        });
      }

      // if student is not found
      if (!found_student) {
        return res.status(404).json({
          success: false,
          message: "Student does not exists",
        });
      }

      // if STUDENT does not own the data
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

// POST /api/v3/students, body = {new student data}
// add a new student
router.post(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      // get new student info from req.body
      const body = (await req.body) as Student;

      // validate req.body with predefined validator
      const result = zStudentPostBody.safeParse(body); // check zod
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      //check if the studentId exists in DB
      const student = await prisma.student.findUnique({
        where: { studentId: result.data.studentId },
      });
      if (student) {
        return res.status(400).json({
          success: false,
          message: "The StudentID is already taken.",
        });
      }

      // add new student and write to DB
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

      // add response header 'Link'
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

// PUT
router.put('/', authenticateToken, async (req: CustomRequest, res: Response) => {
  try {
    const body = await req.body;

    const user = req.user;

    const result = zStudentPutBody.safeParse(body); // check zod
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

    if (user?.role === "ADMIN") {
      const updatedStd = await prisma.student.update({
        where: {
          studentId: result.data.studentId
        },
        data: {
          firstName: result.data.firstName as string,
          lastName: result.data.lastName as string,
          program: result.data.program as string,
          interests: result.data.interests as string[],
          emails: result.data.emails as string[]
        }
      });

      return res.status(200).json({
        success: true,
        message: "Update Student Success",
        data: updatedStd,
      });

    } else if (user?.role === "STUDENT") {
      if (student.studentId !== user.studentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      const updatedStd = await prisma.student.update({
        where: {
          studentId: result.data.studentId
        },
        data: {
          firstName: result.data.firstName as string,
          lastName: result.data.lastName as string,
          program: result.data.program as string,
          interests: result.data.interests as string[],
          emails: result.data.emails as string[]
        }
      });

      return res.status(200).json({
        success: true,
        message: "Update Student Success",
        data: updatedStd,
      });
    }

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Somthing is wrong, please try again",
      error: err,
    });
  }
});

// DELETE
router.delete('/', authenticateToken, checkRoleAdmin, async (req: CustomRequest, res: Response) => {
  try {
    const body = req.body as { studentId: string };

    // const user = req.user;

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
});

export default router;