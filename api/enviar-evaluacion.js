import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  try {
    const { datosPA } = req.body;
    if (!datosPA) {
      return res.status(400).json({ error: 'Faltan datosPA' });
    }

    // ── Completar el 'objeto' (área) del contrato desde Supabase vía REST ──
    // Usa fetch directo (sin dependencias) y va dentro de su propio try:
    // si falla, el objeto no se agrega pero el correo se envía igual.
    if (datosPA.contrato && !datosPA.contrato.objeto && datosPA.contrato.codigo) {
      try {
        const SUPA_URL = process.env.SUPABASE_URL;
        const SUPA_KEY = process.env.SUPABASE_KEY;
        if (SUPA_URL && SUPA_KEY) {
          const codigo = encodeURIComponent(datosPA.contrato.codigo);
          const url = `${SUPA_URL}/rest/v1/contratos?numero_contrato=eq.${codigo}&select=objeto`;
          const r = await fetch(url, {
            headers: {
              apikey: SUPA_KEY,
              Authorization: `Bearer ${SUPA_KEY}`
            }
          });
          if (r.ok) {
            const filas = await r.json();
            if (Array.isArray(filas) && filas[0] && filas[0].objeto) {
              datosPA.contrato.objeto = filas[0].objeto;
              console.log('Objeto del contrato agregado:', filas[0].objeto);
            } else {
              console.warn('No se encontró objeto para el contrato:', datosPA.contrato.codigo);
            }
          } else {
            console.error('Supabase respondió con estado:', r.status);
          }
        } else {
          console.warn('Faltan SUPABASE_URL / SUPABASE_KEY; se omite la búsqueda del objeto.');
        }
      } catch (e) {
        console.error('Fallo al obtener objeto del contrato:', e.message);
      }
    }

    console.log('Datos recibidos:', JSON.stringify(datosPA, null, 2));
    console.log('MAIL_USER definido:', !!process.env.MAIL_USER);
    const transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
      }
    });
    const esComp = datosPA.esComplemento === true;
    // Asunto distinto: es lo que Power Automate usa para enrutar el flujo
    const subject = esComp
      ? `[COMPLEMENTO] Evaluación Proveedor - ${datosPA.proveedor.razonSocial} - ${datosPA.resultados.concepto}`
      : `[EVALUACION] Evaluación Proveedor - ${datosPA.proveedor.razonSocial} - ${datosPA.resultados.concepto}`;
    // Filas adicionales de la tabla solo para el complemento
    const filasComplemento = esComp ? `
          <tr><td style="padding:4px 12px 4px 0"><b>Calif. Administrador:</b></td><td>${datosPA.resultados.calificacionAdministrador}/5.00</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>Calif. Compras:</b></td><td>${datosPA.resultados.calificacionCompras}/5.00</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>Evaluador Admin:</b></td><td>${datosPA.evaluadorAdministrador?.email || ''}</td></tr>
    ` : '';
    const intro = esComp
      ? 'Se completó la <b>calificación complementaria (Compras)</b> de un proveedor de bienes. La calificación final corresponde al promedio de ambas evaluaciones.'
      : 'Nueva evaluación de proveedor completada.';
    await transporter.sendMail({
      from: `"Evaluación Proveedores Aris Mining" <${process.env.MAIL_USER}>`,
      to: 'pablo.alzate@aris-mining.co',
      subject: subject,
      html: `
        <p>${intro}</p>
        <table style="border-collapse:collapse; font-family:Arial; font-size:13px;">
          <tr><td style="padding:4px 12px 4px 0"><b>Proveedor:</b></td><td>${datosPA.proveedor.razonSocial}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>NIT:</b></td><td>${datosPA.proveedor.nit}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>Contrato:</b></td><td>${datosPA.contrato.codigo}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>Tipo:</b></td><td>${datosPA.contrato.tipoNombre}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>Período:</b></td><td>${datosPA.contrato.periodo}</td></tr>
          ${filasComplemento}
          <tr><td style="padding:4px 12px 4px 0"><b>Calificación ${esComp ? 'final' : ''}:</b></td><td>${datosPA.resultados.calificacionTotal}/5.00 - ${datosPA.resultados.concepto}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>Evaluador:</b></td><td>${datosPA.evaluador.email}</td></tr>
        </table>
        <p>La evaluación está disponible en el sistema para revisión.</p>
        <p>Atentamente,<br/>Sistema de Evaluación Aris Mining</p>
        <div style="display:none; visibility:hidden; font-size:1px; color:transparent; height:0; overflow:hidden">${JSON.stringify(datosPA)}</div>
      `
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error completo:', err);
    res.status(500).json({
      error: 'Error enviando email',
      detalle: err.message,
      stack: err.stack
    });
  }
}
