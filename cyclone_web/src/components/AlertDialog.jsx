import React from "react";
import { motion } from "framer-motion";

const backdropVariants = {
  hidden: { opacity: 0, backdropFilter: "blur(0px)" },
  visible: {
    opacity: 1,
    backdropFilter: "blur(8px)",
    transition: { duration: 0.3 },
  },
};

const modalVariants = {
  hidden: { y: "-50px", opacity: 0 },
  visible: {
    y: "0",
    opacity: 1,
    transition: { duration: 0.3 },
  },
};

const AlertDialog = ({ body, title = "Alert", onCancel, onOk }) => {
  // Close the dialog if the backdrop is clicked
  const handleBackdropClick = (e) => {
    if (e.target.id === "myAlertDialog" && onCancel) {
      onCancel();
    }
  };

  return (
    <motion.div
      id="myAlertDialog"
      className="alertdialog show"
      onClick={handleBackdropClick}
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      <motion.div className="alertdialog-content" variants={modalVariants}>
        <div className="alertdialog-header">{title}</div>
        <div className="alertdialog-body">{body}</div>
        <div className="alertdialog-footer">
          <button className="alertdialog-button cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="alertdialog-button" onClick={onOk}>
            OK
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AlertDialog;
