const poolPromise = require("../models/db");
const parkingLotModel = require("../models/parkingLot.model");
const parkingSpotModel = require("../models/parkingSpot.model");

exports.getAll = async () => {
  return await parkingLotModel.getActiveLots();
};

exports.getSpotStatus = async (parkingLotId, userId) => {
  return parkingSpotModel.getSpotStatus(parkingLotId, userId);
};

exports.create = async ({ name, total_spots, image_url, lat, lng }) => {
  if (!name || !total_spots) {
    throw { status: 400, message: "Thiếu dữ liệu bãi đỗ" };
  }

  const pool = await poolPromise;
  const tx = pool.transaction();
  await tx.begin();

  try {
    const parkingLotId = await parkingLotModel.create(tx, {
      name,
      total_spots,
      image_url,
      lat,
      lng,
    });

    await parkingSpotModel.bulkCreate(tx, parkingLotId, total_spots);

    await tx.commit();

    return {
      msg: "Tạo bãi đỗ & sinh chỗ đỗ thành công",
      parking_lot_id: parkingLotId,
      total_spots,
    };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
};
