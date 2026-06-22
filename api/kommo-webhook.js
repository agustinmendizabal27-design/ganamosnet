export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = req.body;

    // Log para ver qué manda Kommo
    console.log('KOMMO BODY:', JSON.stringify(body));
    console.log('KOMMO_STAGE_ID configurado:', process.env.KOMMO_STAGE_ID);

    const leadsUpdate = body?.leads?.update;
    if (!leadsUpdate || !leadsUpdate.length) {
      console.log('No hay leads update');
      return res.status(200).json({ status: 'no_update' });
    }

    const ETAPA_CARGA_CONFIRMADA = process.env.KOMMO_STAGE_ID;

    for (const lead of leadsUpdate) {
      console.log('Lead status_id:', lead.status_id, 'Comparando con:', ETAPA_CARGA_CONFIRMADA);
      const statusId = lead.status_id?.toString();

      if (statusId === ETAPA_CARGA_CONFIRMADA) {
        const valor = parseFloat(lead.price) || 0;
        console.log('Disparando Purchase con valor:', valor);
        await dispararPurchase(valor);
      }
    }

    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Kommo webhook error:', error);
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

  console.log('Enviando Purchase a Meta:', JSON.stringify(payload));

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );

  const result = await response.json();
  console.log('Respuesta de Meta:', JSON.stringify(result));
  return result;
}
