export const otpEmailTemplate = ({ otp, validityMinutes = 5 }) => {
  const logo = process.env.BRICS_LOGO_URL;

  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial, Helvetica, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;">
      <tr>
        <td align="center" style="padding:50px 20px;">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;">
            <tr>
              <td style="padding:45px 40px 35px 40px;">

                <!-- Logo -->
                <img src="${logo}" width="170"
                  style="display:block;margin:0 auto 35px;" alt="BRICS 2026"/>

                <!-- Main Text -->
                <p style="
                  font-size:16px;
                  color:#222;
                  line-height:1.7;
                  margin:0 0 28px;
                ">
                  Please use the following One-Time Password (OTP) to log in to the BRICS 2026 Portal:
                </p>

                <!-- OTP Box -->
                <div style="text-align:center;margin:32px 0;">
                  <span style="
                    background:#f37021;
                    color:#ffffff;
                    padding:16px 48px;
                    border-radius:6px;
                    font-size:22px;
                    letter-spacing:2px;
                    font-weight:600;
                    display:inline-block;
                  ">
                    ${otp}
                  </span>
                </div>

                <!-- Validity -->
                <p style="
                  font-size:14.5px;
                  color:#444;
                  line-height:1.7;
                  margin:22px 0 8px;
                ">
                  This OTP is valid for <strong>${validityMinutes} minutes</strong> and is required to complete the login process.
                </p>

                <p style="
                  font-size:14.5px;
                  color:#444;
                  line-height:1.7;
                  margin:8px 0;
                ">
                  For security reasons, please do not share this OTP with anyone.
                </p>

                <p style="
                  font-size:14.5px;
                  color:#444;
                  line-height:1.7;
                  margin:8px 0 26px;
                ">
                  If you have not initiated this login request, you may safely ignore this email.
                </p>

                <!-- Footer -->
                <p style="
                  font-size:13.5px;
                  color:#bdbdbd;
                  margin-top:20px;
                ">
                  Regards,<br/>
                  Team BRICS INDIA
                </p>

              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};
