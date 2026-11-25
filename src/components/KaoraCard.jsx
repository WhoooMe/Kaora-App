import React from "react";

const KaoraCard = ({ className = "", children, ...props }) => (
  <section className={"card " + className} {...props}>
    {children}
  </section>
);

export default KaoraCard;
