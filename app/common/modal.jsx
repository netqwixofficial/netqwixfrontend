import React from "react";
import { Modal as ReactStrapModal, ModalBody, ModalFooter } from "reactstrap";

const Modal = ({
  isOpen,
  id,
  element,
  toggle,
  footer = false,
  width,
  allowFullWidth = false,
  height,
  overflowHidden = false,
  minHeight = false,
  className = "",
  scrollableBody = false,
}) => {
  const bodyStyle = scrollableBody
    ? { maxHeight: "85vh", overflowY: "auto", overflowX: "hidden" }
    : undefined;

  return (
    <ReactStrapModal
      className={`${
        allowFullWidth
          ? "react-strap-modal-full"
          : "custom-react-strap-modal-full"
      } ${className}`}
      isOpen={isOpen}
      toggle={toggle}
      key={id}
      style={{
        width,
        height,
        overflow: overflowHidden ? "hidden" : null,
        minHeight: minHeight ? "100vh" : null,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && toggle) {
          toggle();
        }
      }}
    >
      <ModalBody style={bodyStyle}>{element}</ModalBody>
      {footer &&<ModalFooter>{footer}</ModalFooter>}
    </ReactStrapModal>
  );
};

export default Modal;