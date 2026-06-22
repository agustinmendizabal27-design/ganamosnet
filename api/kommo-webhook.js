export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = req.body;
    console.log('BODY:', JSON.stringify(body));

    const ETAPA_CARGA_CONFIRMADA = process.env.KOMMO_STAGE_ID;

    // Kommo manda form-encoded: leads[update][0][id], leads[update][0][status_id], etc.
    // Buscar todos los status_id de leads actualizados
    let disparado = false;

    for (const key of Object.keys(body)) {
      // Buscar keys tipo leads[update][N][status_id]
      if (key.match(/leads\[update\]\[\d+\]\[status_id\]/)) {
        const statusId = body[key]?.toString();
        console.log('status_id encontrado:', statusId, 'esperado:', ETAPA_CARGA_CONFIRMADA);

        if (statusId === ETAPA_CARGA_CONFIRMADA) {
          // Buscar el precio del mismo lead
          const index = key.match(/leads\[update\]\[(\d+)\]/)[1];
          const priceKey = `leads[update][${index}][price]`;
          const valor = parseFloat(body[priceKey]) || 0;
          console.log('Disparando Purchase, valor:', valor);
          await dispararPurchase(valor);
          disparado = true;
        }
      }
    }

    if (!disparado) {
      console.log('Ningún lead coincide con la etapa de carga confirmada');
    }

    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function dispararPurchase(valor) {
  const pixelId = process.env.FB_PIXEL_ID;
  const accessToken = process.env.FB_ACCESS_TOKEN;

  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'crm',
      event_source_url: 'https://ganamosnet-five.vercel.app/',
      user_data: {
        client_user_agent: 'Kommo CRM'
      },
      custom_data: {
        value: valor,
        currency: 'ARS'
      }
    }]
  };

  console.log('Enviando Purchase a Meta...');
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );

  const result = await response.json();
  console.log('Respuesta Meta:', JSON.stringify(result));
  return result;
}
