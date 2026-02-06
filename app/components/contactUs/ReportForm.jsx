import React from "react";
import { Modal, ModalBody, ModalFooter, Button } from "reactstrap";
import { useFormik } from "formik";
import * as Yup from "yup";
import { RxCross2 } from "react-icons/rx";
import { authState } from "../auth/auth.slice";
import { useAppSelector, useAppDispatch } from "../../store";
import { Utils } from "../../../utils/utils";
import { userConcernAsync } from "./contactus.slice";
import { isIOS } from 'react-device-detect';
const ReportForm = ({
  isOpen,
  setIsReportFormOpen,
  sessionId,
  bookingInfo,
}) => {
  const { userInfo } = useAppSelector(authState);
  const [reasonValue, setReasonValue] = React.useState("");
  const dispatch = useAppDispatch();
  const initialValues = {
    name: userInfo?.fullname || "",
    email: userInfo?.email || "",
    phone: userInfo?.mobile_no || "",
    desc: "",
    subject: "",
    reason: "",
    is_releted_to_refund: ""
  };

  const validationSchema = Yup.object().shape({
    name: Yup.string()
      .matches(/^[A-Za-z\s]+$/, "Name must contain only letters")
      .required("Name is required"),
    email: Yup.string()
      .email("Invalid email format")
      .matches(
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Invalid email format"
      )
      .required("Email is required"),
    phone: Yup.string()
      .matches(
        /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/,
        "Phone must contain only digits"
      )
      .min(10, "Phone must be exactly 10 digits")
      .max(10, "Phone must be exactly 10 digits")
      .required("Phone is required"),
    reason: Yup.string().required("Please select reason"),
    subject: Yup.string().required("Subject is required"),
    desc: Yup.string().required("Description is required"),
    is_releted_to_refund: Yup.string(),
  });

  const onSubmit = (values, { setSubmitting, resetForm }) => {
    dispatch(
      userConcernAsync({
        name: values?.name || userInfo?.fullname,
        email: values?.email?.toLowerCase() || userInfo?.email?.toLowerCase(),
        phone_number: values?.phone || userInfo?.mobile_no,
        reason: values?.reason,
        subject: values?.subject,
        description: values?.desc,
        is_releted_to_refund: values?.reason === "Request for Refund" ? "Yes" : !values.is_releted_to_refund ? "Yes" : values.is_releted_to_refund,
        booking_id: sessionId,
      })
    );
    resetForm();
    setSubmitting(false);
    setIsReportFormOpen(false);
  };

  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit,
    validateOnChange: true,
  });

  return (
    <Modal isOpen={isOpen} className="react-strap-modal-full">
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <RxCross2
          style={{
            fontSize: "22px",
            color: "#000080",
            margin: "5px 5px 0 0",
            cursor: "pointer",
          }}
          onClick={() => {
            formik.resetForm();
            setIsReportFormOpen(false);
          }}
        />
      </div>
      <h3 className="form-header">Report Form</h3>

      <form onSubmit={formik.handleSubmit} className="form-container centered-form">
        <ModalBody style={{ display: 'flex', justifyContent: 'center', }}>
          <div style={{ width: '100%', maxWidth: '500px' }}>
            <div
              style={{
                marginTop: "16px",
              }}
            >
              <div
                className="row"
                style={{
                  marginLeft: "0px",
                  marginRight: "0px",
                }}
              >
                <div className="col">
                  <dl className="row ml-1 mb-0">
                    <dd>Expert :</dd>
                    <dt className="ml-1">{bookingInfo?.trainer}</dt>
                  </dl>
                </div>
                <div className="col">
                  <dl className="row mb-0">
                    <dd className="ml-3">Enthusiasts :</dd>
                    <dt className="ml-1">{bookingInfo?.trainee}</dt>
                  </dl>
                </div>
              </div>
              <div
                className="row"
                style={{
                  marginLeft: "0px",
                  marginRight: "0px",
                }}
              >
                <div className="col">
                  <dl className="row ml-1 mb-0">
                    <dd>Date :</dd>
                    <dt className="ml-1">
                      {Utils.getDateInFormat(bookingInfo?.date)}
                    </dt>
                  </dl>
                </div>
                <div className="col">
                  <dl className="row mb-0">
                    <dd className="ml-3">Time :</dd>
                    <dt className="ml-1">{`${bookingInfo?.startTime} - ${bookingInfo?.endTime}`}</dt>
                  </dl>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-control"
                {...formik.getFieldProps("name")}
              />
              {formik.touched.name && formik.errors.name && (
                <div className="text-danger">{formik.errors.name}</div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-control"
                {...formik.getFieldProps("email")}
              />
              {formik.touched.email && formik.errors.email && (
                <div className="text-danger">{formik.errors.email}</div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="text"
                id="phone"
                name="phone"
                className="form-control"
                value={formik.values.phone}
                onChange={(e) => {
                  const newValue = e.target.value.replace(/\D/, "");

                  if (!isNaN(newValue) && newValue.length <= 10) {
                    formik.setFieldValue("phone", newValue);
                  }
                }}
              />
              {formik.touched.phone && formik.errors.phone && (
                <div className="text-danger">{formik.errors.phone}</div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="reason">Reasons</label>
              <select
                id="reason"
                name="reason"
                className="form-control"
                {...formik.getFieldProps("reason")}
              >
                <option value="">Select</option>
                <option value="Technical issue">Technical issue</option>
                <option value="Request for Refund">Request for Refund</option>
              </select>
              {formik.touched.reason && formik.errors.reason && (
                <div className="text-danger">{formik.errors.reason}</div>
              )}
            </div>
            {
              formik.values.reason === "Technical issue" ?
                <div className="form-group">
                  <label htmlFor="reason">Related to refund</label>
                  <select
                    id="is_releted_to_refund"
                    name="is_releted_to_refund"
                    className="form-control"
                    {...formik.getFieldProps("is_releted_to_refund")}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  {formik.touched.is_releted_to_refund && formik.errors.is_releted_to_refund && (
                    <div className="text-danger">{formik.errors.is_releted_to_refund}</div>
                  )}
                </div> : null
            }
            <div className="form-group">
              <label htmlFor="name">Subject</label>
              <input
                type="text"
                id="subject"
                name="subject"
                className="form-control"
                {...formik.getFieldProps("subject")}
              />
              {formik.touched.subject && formik.errors.subject && (
                <div className="text-danger">{formik.errors.subject}</div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="desc">Description</label>
              <textarea
                id="desc"
                name="desc"
                className="form-control"
                {...formik.getFieldProps("desc")}
              />
              {formik.touched.desc && formik.errors.desc && (
                <div className="text-danger">{formik.errors.desc}</div>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="btn-container" style={{ display: 'flex', justifyContent: 'center',paddingBottom: isIOS ? '30%': '20px' }}>
          <Button
            type="submit"
            color="primary"
            disabled={formik.isSubmitting}
            className="form-btn"
          >
            Submit
          </Button>{" "}
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default ReportForm;
