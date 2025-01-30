// import nodemailer from 'nodemailer';

// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   secure: false, // true for 465, false for other ports
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS
//   }
// });

// export const sendEmail = async (to, subject, text) => {
//   try {
//     const mailOptions = {
//       from: process.env.SMTP_FROM,
//       to,
//       subject: `Wynngrid - ${subject}`,
//       text
//     };

//     console.log('Sending email with options:', {
//       host: process.env.SMTP_HOST,
//       port: process.env.SMTP_PORT,
//       user: process.env.SMTP_USER,
//       from: process.env.SMTP_FROM,
//       to: to
//     });

//     const info = await transporter.sendMail(mailOptions);
//     console.log('Email sent:', info.response);
//     return info;
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
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (to, subject, text) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to,
      subject: `Wynngrid - ${subject}`,
      html: `
     <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f4f4f4;">
  
  <!-- Wrapper Table for Better Responsiveness -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        
        <!-- Banner Image (59% on Desktop, 100% on Mobile) -->
        <img src="https://drive.google.com/uc?export=view&id=1nEl-mh_Q07O2aWGYmQWDUZTGH3PrBddA" 
             alt="Banner" 
             style="width: 100%; max-width: 640px; height: auto; display: block;">
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: auto;">
          
          <!-- Email Text -->
          <p style="color: #555; font-size: 16px;">${text}</p>

          <hr style="border: 1px solid #ddd;">

          <p style="font-size: 14px; color: #888;">&copy; 2025 Wynngrid. All rights reserved.</p>
        </div>

        <!-- Logo Image (59% on Desktop, 100% on Mobile) -->
        <img src="https://drive.google.com/uc?export=view&id=1nSM9-pYtsZPYNPSr73i49DqzKWYexm4y" 
             alt="Logo" 
             style="width: 100%; max-width: 640px; height: auto; display: block; margin: 10px auto;">
        
      </td>
    </tr>
  </table>

</div>



      `,
    };

    console.log('Sending email with options:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM,
      to: to,
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
