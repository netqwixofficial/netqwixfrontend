import React, { useEffect, useRef, useState } from "react";
import { Form, Formik, FieldArray } from "formik";
import * as Yup from "yup";
import { HandleErrorLabel } from "../../../common/error";
import {
  DUMMY_URLS,
  MAXIMUM_RATE,
  MINIMUM_RATE,
  TRAINER_AMOUNT_USD,
  validationMessage,
} from "../../../common/constants";
import { MinusCircle, PlusCircle } from "react-feather";
import { Input, InputGroup } from "reactstrap";
import { Utils } from "../../../../utils/utils";

export const UpdateHourlyRateForm = ({ userInfo, onFormSubmit, extraInfo }) => {
  const formRef = useRef(null);
  const initialValues = {
    hourly_rate: "",
  };

  useEffect(() => {
    if (userInfo) {
      if (formRef && formRef.current) {
        formRef.current.setValues({
          // by default it's TRAINER_AMOUNT_USD
          hourly_rate: +userInfo.extraInfo?.hourly_rate || TRAINER_AMOUNT_USD,
        });
      }
    }
    // Important: only re-sync the form when the actual hourly_rate value changes.
    // If we depend on the whole `userInfo` object, we can re-apply the old rate
    // while the user is trying to clear the input, which makes it look like
    // "1 0" never gets removed.
  }, [userInfo?.extraInfo?.hourly_rate]);

  const validationSchema = Yup.object().shape({
    hourly_rate: Yup.number()
      .min(MINIMUM_RATE, `Hourly rate must be at least ${MINIMUM_RATE}`)
      .max(MAXIMUM_RATE, `Hourly rate must not exceed ${MAXIMUM_RATE}`)
      .required("This field is required")
      .nullable(),
  });

  return (
    <Formik
      innerRef={formRef}
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onFormSubmit}
    >
      {({
        values,
        errors,
        touched,
        handleSubmit,
        handleBlur,
        setFieldValue,
        setValues,
        isValid,
        handleChange,
      }) => (
        <Form onSubmit={handleSubmit}>
          <div className="container mb-3">
            {/* hourly_rate */}
            <label className="col-form-label">Hourly Rate ($)</label>
            <div className="row">
              <div className="col-4">
                <div className="form-group">
                  <input
                    onChange={(event) => {
                      const { value } = event.target;
                      setValues({
                        ...values,
                        hourly_rate: value ? +value : null,
                      });
                    }}
                    value={values.hourly_rate || ""}
                    type="number"
                    placeholder="Hourly rate"
                    onBlur={handleBlur}
                    className={`form-control mt-1 ${
                      touched.hourly_rate && errors.hourly_rate
                        ? `border border-danger`
                        : ``
                    }`}
                    name="hourly_rate"
                    id="hourly_rate"
                    cols="10"
                    rows="3"
                  />
                </div>
              </div>
            </div>
            <div>
              <HandleErrorLabel
                isError={errors.hourly_rate}
                isTouched={
                  touched.hourly_rate && errors.hourly_rate ? true : false
                }
              />
            </div>
            <div className=" mt-4">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  !isValid ||
                  !values.hourly_rate ||
                  +extraInfo?.hourly_rate === values.hourly_rate
                }
              >
                Save
              </button>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
};
