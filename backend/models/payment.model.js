const poolPromise = require("./db");

exports.getSuccessByTicket = async (ticket, tx) => {
  const req = tx ? tx.request() : (await poolPromise).request();

  const res = await req.input("ticket", ticket).query(`
    SELECT TOP 1 *
    FROM Payment
    WHERE ticket = @ticket
      AND status = 'SUCCESS'
  `);

  return res.recordset[0];
};

exports.markRefunded = async (tx, paymentId) => {
  await tx.request().input("id", paymentId).query(`
      UPDATE Payment
      SET status = 'REFUNDED',
          refunded_at = GETDATE()
      WHERE id = @id
    `);
};
