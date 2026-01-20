const ticketService = require("../services/ticket.service");

exports.verify = async (req, res) => {
  try {
    const result = await ticketService.verifyTicket(req.body);
    res.json(result);
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(err.status || 500).json({ msg: err.message });
  }
};

exports.getDetail = async (req, res) => {
  try {
    const data = await ticketService.getTicketDetail(req.params.ticket);
    res.json(data);
  } catch (err) {
    console.error("GET TICKET ERROR:", err);
    res.status(err.status || 500).json({ msg: err.message });
  }
};
