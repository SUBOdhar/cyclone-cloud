import React from "react";

const AlertDialog = ({ body, title = "Alert", onCancel, onOk }) => {
  // Handler for clicks on the backdrop
  const handleBackdropClick = (e) => {
    // Close the dialog if the backdrop is clicked (i.e. if the clicked element has the dialog's id)
    if (e.target.id === "myAlertDialog" && onCancel) {
      onCancel();
    }
  };

  return (
    <div
      id="myAlertDialog"
      className="alertdialog show"
      onClick={handleBackdropClick}
    >
      <div className="alertdialog-content">
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
      </div>
    </div>
  );
};

export default AlertDialog;
