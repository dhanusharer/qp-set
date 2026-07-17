import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("amcec@2024", 12);
  const hodHash = await bcrypt.hash("hod@2024", 12);
  const facultyHash = await bcrypt.hash("faculty@123", 12);

  console.log("Upserting Controller...");
  const controller = await prisma.user.upsert({
    where: { username: "controller" },
    update: {},
    create: {
      username: "controller",
      passwordHash,
      role: Role.controller,
      name: "Dr. Nandishwar",
      title: "Controller of Examinations",
      email: "nandishwar@amcec.edu.in"
    }
  });

  console.log("Upserting HOD...");
  const hod = await prisma.user.upsert({
    where: { username: "hod_cse" },
    update: {},
    create: {
      username: "hod_cse",
      passwordHash: hodHash,
      role: Role.hod,
      name: "Dr. Meena Sharma",
      dept: "CSE (AI & ML)",
      title: "HOD & QP Coordinator",
      email: "meena@amcec.edu.in"
    }
  });

  console.log("Upserting Faculty...");
  const faculty = await prisma.user.upsert({
    where: { username: "swati" },
    update: {
      dept: "CSE (AI & ML)"
    },
    create: {
      username: "swati",
      passwordHash: facultyHash,
      role: Role.qpsetter,
      name: "Prof. Swati",
      email: "swati@amcec.edu.in",
      dept: "CSE (AI & ML)",
      hodId: hod.id,
      affiliation: "internal",
      college: "AMC Engineering College"
    }
  });

  console.log("Upserting Course...");
  const course = await prisma.course.upsert({
    where: { courseCode_semester_schemeYear: { courseCode: "21CS32", semester: "3rd Semester", schemeYear: "2021 Scheme" } },
    update: {},
    create: {
      courseName: "Data Structures & Algorithms",
      courseCode: "21CS32",
      semester: "3rd Semester",
      schemeYear: "2021 Scheme",
      credits: 4,
      examTypes: ["Internal Assessment (40M)", "End Semester (100M)"],
      bos: "CSE, AI & ML",
      hodId: hod.id
    }
  });

  console.log("Upserting Assignment...");
  await prisma.assignment.upsert({
    where: { assessmentCode: "1IA_3Sem_May2026_21CS32" },
    update: {},
    create: {
      assessmentCode: "1IA_3Sem_May2026_21CS32",
      description: "1st Internal Assessment - 3rd Semester CSE AI&ML",
      facultyId: faculty.id,
      hodId: hod.id,
      courseId: course.id,
      examType: "1st Internal Assessment (40 Marks)",
      dueDate: new Date("2026-05-15"),
      assignedDate: new Date("2026-04-20"),
      assignedById: controller.id,
      instructions: "Follow VTU format. Cover modules 1 and 2."
    }
  });

  console.log("Seeding completed successfully!");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
