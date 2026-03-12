const router = require("express").Router();
const auth = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const ctrl = require("../controllers/manager.controller");

// DASHBOARD
/**
 * @swagger
 * tags:
 *   name: Manager
 *   description: Các chức năng dành cho quản lý hệ thống
 */

/**
 * @swagger
 * /api/manager/dashboard:
 *   get:
 *     summary: Lấy dữ liệu tổng quan cho Dashboard
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dữ liệu dashboard
 */
router.get("/dashboard", auth, ctrl.dashboard);

// PARKING LOT
/**
 * @swagger
 * /api/manager/parking-lots:
 *   get:
 *     summary: Danh sách tất cả bãi đỗ xe (Manager)
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách bãi đỗ
 */
router.get("/parking-lots", auth, ctrl.getParkingLots);

/**
 * @swagger
 * /api/manager/parking-lots:
 *   post:
 *     summary: Tạo bãi đỗ xe mới kèm hình ảnh
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post(
  "/parking-lots",
  auth,
  upload.single("image"),
  ctrl.createParkingLot
);

/**
 * @swagger
 * /api/manager/parking-lots/{id}:
 *   put:
 *     summary: Cập nhật thông tin bãi đỗ xe
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               total_spots:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/parking-lots/:id", auth, ctrl.updateParkingLot);

/**
 * @swagger
 * /api/manager/parking-lots/{id}:
 *   delete:
 *     summary: Xóa bãi đỗ xe
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete("/parking-lots/:id", auth, ctrl.deleteParkingLot);

// STAFF
/**
 * @swagger
 * /api/manager/staff:
 *   get:
 *     summary: Danh sách nhân viên
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách nhân viên
 */
router.get("/staff", auth, ctrl.getStaff);

/**
 * @swagger
 * /api/manager/staff:
 *   post:
 *     summary: Tạo tài khoản nhân viên mới
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - email
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post("/staff", auth, ctrl.createStaff);

/**
 * @swagger
 * /api/manager/staff/{id}:
 *   put:
 *     summary: Cập nhật thông tin nhân viên
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/staff/:id", auth, ctrl.updateStaff);

/**
 * @swagger
 * /api/manager/staff/{id}:
 *   delete:
 *     summary: Xóa tài khoản nhân viên
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete("/staff/:id", auth, ctrl.deleteStaff);

// ASSIGNMENT
/**
 * @swagger
 * /api/manager/assign-staff:
 *   post:
 *     summary: Phân công nhân viên vào bãi đỗ
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staff_id
 *               - parking_lot_id
 *             properties:
 *               staff_id:
 *                 type: integer
 *               parking_lot_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Phân công thành công
 */
router.post("/assign-staff", auth, ctrl.assignStaff);

/**
 * @swagger
 * /api/manager/assignments:
 *   get:
 *     summary: Danh sách phân công nhân viên
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách phân công
 */
router.get("/assignments", auth, ctrl.getAssignments);

/**
 * @swagger
 * /api/manager/assignments/{id}:
 *   put:
 *     summary: Cập nhật phân công
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *       - in: body
 *         name: body
 *         schema:
 *           type: object
 *           properties:
 *             parking_lot_id:
 *               type: integer
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/assignments/:id", auth, ctrl.updateAssignment);

/**
 * @swagger
 * /api/manager/assignments/{id}:
 *   delete:
 *     summary: Xóa phân công
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete("/assignments/:id", auth, ctrl.deleteAssignment);

// CONTACT MESSAGE
/**
 * @swagger
 * /api/manager/contact-messages:
 *   get:
 *     summary: Lấy danh sách tin nhắn liên hệ
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách tin nhắn
 */
router.get("/contact-messages", auth, ctrl.getContactMessages);

/**
 * @swagger
 * /api/manager/contact-messages/{id}:
 *   get:
 *     summary: Đọc chi tiết tin nhắn liên hệ
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Chi tiết tin nhắn
 */
router.get("/contact-messages/:id", auth, ctrl.readContactMessage);

// STATS
/**
 * @swagger
 * /api/manager/parking-stats:
 *   get:
 *     summary: Thống kê số lượng đỗ xe theo thời gian
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dữ liệu thống kê
 */
router.get("/parking-stats", auth, ctrl.getParkingStats);

module.exports = router;
