const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET device by MAC address
router.get('/:mac', async (req, res) => {
  const { mac } = req.params;

  try {
    const device = await prisma.device.findUnique({
      where: { mac }
    });

    if (!device) return res.status(404).json({ error: "Device not found" });

    res.json(device);
  } catch (error) {
    console.error("GET /devices/:mac error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT to rename a device
router.put('/:mac', async (req, res) => {
  const { mac } = req.params;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: "Invalid name" });
  }

  try {
    const updatedDevice = await prisma.device.update({
      where: { mac },
      data: { name }
    });

    res.json({ success: true, device: updatedDevice });
  } catch (error) {
    console.error("PUT /devices/:mac error:", error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: "Device not found" });
    } else {
      res.status(500).json({ error: "Server error" });
    }
  }
});

module.exports = router;
