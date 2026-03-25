import { capitalizeName } from "../config/capitalizeName.js";

export const delegateInviteTemplate = ({
  name,
  eventName,
  start,
  end,
  venue,
}) => {
  const logo = process.env.BRICS_LOGO_URL;
  const portalUrl = `${process.env.FRONTEND_URL}/login`;

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f8;
font-family:'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:6px;
               font-family:'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          <tr>
            <td style="padding:45px 50px;">

              <img src="${logo}" width="180" style="display:block;margin:0 auto 35px;" />

              <p style="font-size:16px;font-weight:500;color:#000;">
                Dear ${capitalizeName(name)},
              </p>

              <p style="font-size:15px;font-weight:400;color:#000;line-height:24px;">
                Team BRICS INDIA is pleased to invite you for participation in 
                <strong>${capitalizeName(eventName)}</strong>, to be held at <strong>${venue}</strong> on 
                <strong>${start}</strong>.
              </p>

              <p style="font-size:14px;font-weight:400;color:#000;line-height:23px;">
                You are kindly requested to submit the required details and supporting documents through the accreditation module for completion of the accreditation process.
              </p>

              <div style="margin:34px 0;text-align:center;">
                <a href="${portalUrl}" 
                   style="
                     background:#f37021;
                     color:#ffffff;
                     padding:14px 32px;
                     border-radius:6px;
                     text-decoration:none;
                     font-size:14px;
                     font-weight:600;
                     display:inline-block;
                   ">
                  Accreditation Portal Link
                </a>
              </div>

              <p style="font-size:14px;color:#000;line-height:22px;">
                Please visit the portal and complete your profile registration at the earliest to facilitate timely processing.
              </p>

              <p style="margin-top:36px;font-size:13px;color:#aaa;line-height:20px;">
                Regards,<br/>
                <strong>Team BRICS INDIA</strong>
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
