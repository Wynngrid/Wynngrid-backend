
// import nodemailer from 'nodemailer';

// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST, // e.g., smtp.gmail.com
//   port: parseInt(process.env.SMTP_PORT, 10), // Typically 465 (SSL) or 587 (TLS)
//   secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
//   auth: {
//     user: process.env.SMTP_USER, // Your email address
//     pass: process.env.SMTP_PASS, // Your app-specific password
//   },
//   tls: {
//     rejectUnauthorized: false, // For self-signed certificates, if applicable
//   },
// });

// export const sendEmail = async (to, subject, text) => {
//   try {
//     const info = await transporter.sendMail({
//       from: `"Wynngrid" <${process.env.SMTP_FROM}>`, // Sender address
//       to, // Receiver's email
//       subject, // Subject line
//       text, // Plain text body
//     });

//     console.log(`Email sent: ${info.messageId}`);
//   } catch (error) {
//     console.error('Error sending email:', error);
//     throw error;
//   }
// };
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const sendEmail = async (to, subject, text) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to,
      subject: `Wynngrid - ${subject}`,
      text
    };

    console.log('Sending email with options:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM,
      to: to
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
