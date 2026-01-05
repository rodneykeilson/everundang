import React from "react";
import { useLocale } from "../hooks/useLocale";
import "./DigitalPass.css";

interface DigitalPassProps {
  name: string;
  token: string;
  eventTitle: string;
  eventDate: string;
}

const DigitalPass: React.FC<DigitalPassProps> = ({ name, token, eventTitle, eventDate }) => {
  const { t } = useLocale();

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${token}`;

  return (
    <div className="digital-pass">
      <div className="digital-pass__header">
        <span className="digital-pass__badge">{t("passBadge")}</span>
        <h3>{eventTitle}</h3>
        <p>{eventDate}</p>
      </div>
      <div className="digital-pass__body">
        <div className="digital-pass__qr">
          <img src={qrUrl} alt="Check-in QR Code" />
        </div>
        <div className="digital-pass__info">
          <span className="label">{t("passGuestLabel")}</span>
          <span className="value">{name}</span>
          <span className="label">{t("passTokenLabel")}</span>
          <span className="value token">{token}</span>
        </div>
      </div>
      <div className="digital-pass__footer">
        <p>{t("passInstructions")}</p>
      </div>
    </div>
  );
};

export default DigitalPass;
