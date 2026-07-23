export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userName, amount, itemDetails } = req.body;

  // Mengambil Server Key dari Environment Variable Vercel
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  if (!serverKey) {
    return res.status(500).json({ error: 'Server Key Midtrans belum dikonfigurasi di Vercel.' });
  }

  const authHeader = 'Basic ' + Buffer.from(serverKey + ':').toString('base64');
  const orderId = 'FARO-VIP-' + Date.now();

  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount || 15000
    },
    customer_details: {
      first_name: userName || "Pelanggan FARO"
    },
    item_details: [
      {
        id: "VIP-01",
        price: amount || 15000,
        quantity: 1,
        name: itemDetails || "Langganan VIP FARO Hub"
      }
    ]
  };

  try {
    const response = await fetch('https://app.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({ token: data.token, redirect_url: data.redirect_url });
    } else {
      return res.status(response.status).json({ error: data.error_messages || "Midtrans Error" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
