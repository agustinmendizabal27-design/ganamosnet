import crypto from 'crypto';

function hashSHA256(value) {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

async function getLeadContact(leadId) {
  const kommoToken = process.env.KOMMO_TOKEN;
  const kommoDomain = process.env.KOMMO_DOMAIN;

  try {
    const resLead = await fetch(
      `https://${kommoDomain}/api/v4/leads/${leadId}?with=contacts`,
      { headers: { Authorization: `Bearer ${kommoToken}` } }
    );
    const lead = await resLead.json();
    console.log('Lead contacts:', JSON.stringify(lead?._embedded?.contacts));

    const contactId = lead?._embedded?.contacts?.[0]?.id;
    if (!contactId) {
      console.log('No se encontró contacto para lead:', leadId);
      return {};
    }

    const resContact = await fetch(
      `https://${kommoDomain}/api/v4/contacts/${contactId}`,
      { headers: { Authorization: `Bearer ${kommoToken}` } }
    );
    const contact = await resContact.json();
    console.log('Contact fields:', JSON.stringify(contact?.custom_fields_values));

    const phoneField = contact?.custom_fields_values?.find(f => f.field_code === 'PHONE');
    const rawPhone = phoneField?.values?.[0]?.value || '';
    const phone = rawPhone.replace(/\D/g, '');

    const emailField = contact?.custom_fields_values?.find(f => f.field_code === 'EMAIL');
    const email = emailField?.values?.[0]?.value || '';

    console.log('Teléfono:', phone);
    console.log('Email:', email);

    return { phone, email };
  } catch (error) {
    console.error('Error obteniendo contacto de Kommo:', error);
    return {};
  }
}

async function dispararPurchase(valor, leadData = {}) {
  const pixelId = process.env.FB_PIXEL_ID;
  const accessToken = process.env.FB_ACCESS_TOKEN;

  const user_data = {};
  if (leadData.phone) user_data.ph = hashSHA256(leadData.phone);
  if (leadData.email) user_data.em = hashSHA256(leadData.email);

  if (Object.keys(user_data).length === 0) {
    console.log('Sin datos de usuario, enviando con user_data mínimo');
    user_data.client_user_agent = 'Mozilla/5.0';
  }

  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: 'https://agustinmendizabal27-design.github.io/ganamosnet/',
      user_data,
      custom_data: {
        value: valor,
        currency: 'ARS'
      }
    }]
  };

  console.log('Payload Meta:', JSON.stringify(payload));
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
    let disparado = false;

    for (const key of Object.keys(body)) {
      if (key.match(/leads\[update\]\[\d+\]\[status_id\]/)) {
        const statusId = body[key]?.toString();
        console.log('status_id encontrado:', statusId, 'esperado:', ETAPA_CARGA_CONFIRMADA);

        if (statusId === ETAPA_CARGA_CONFIRMADA) {
          const index = key.match(/leads\[update\]\[(\d+)\]/)[1];
          const leadId = body[`leads[update][${index}][id]`];
          const priceKey = `leads[update][${index}][price]`;
          const valor = parseFloat(body[priceKey]) || 0;

          console.log('Lead ID:', leadId);
          console.log('Disparando Purchase, valor:', valor);

          const leadData = await getLeadContact(leadId);
          await dispararPurchase(valor, leadData);
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
