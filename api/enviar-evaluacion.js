const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { datosPA } = req.body;

    if (!datosPA) {
      return res.status(400).json({ error: 'Faltan datosPA' });
    }

    // Log para debug
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

    await transporter.sendMail({
      from: `"Evaluación Proveedores Aris Mining" <${process.env.MAIL_USER}>`,
      to: 'pablo.alzate@aris-mining.co',
      subject: `Evaluación Proveedor - ${datosPA.proveedor.razonSocial} - ${datosPA.resultados.concepto}`,
      html: `
        <p>Nueva evaluación de proveedor completada.</p>
        <table style="border-collapse:collapse; font-family:Arial; font-size:13px;">
          <tr><td style="padding:4px 12px 4px 0"><b>Proveedor:</b></td><td>${datosPA.proveedor.razonSocial}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>NIT:</b></td><td>${datosPA.proveedor.nit}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>Contrato:</b></td><td>${datosPA.contrato.codigo}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>Tipo:</b></td><td>${datosPA.contrato.tipoNombre}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>Período:</b></td><td>${datosPA.contrato.periodo}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>Calificación:</b></td><td>${datosPA.resultados.calificacionTotal}/5.00 - ${datosPA.resultados.concepto}</td></tr>
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
};
