// ShareModal.js

import React from 'react';
import { Button, Modal } from 'reactstrap'; // Adjust based on your library
import { X } from "react-feather";
import { Utils } from '../../../../utils/utils';



const ShareModalTrainee = ({ isOpen, onClose, selectedClips, clips, isTrainer, userInfo, addTraineeClipInBookedSession, setSelectedClips }) => {
  return (
    <Modal isOpen={isOpen} toggle={onClose} size="xl">
      <div className="modal-content">
        <div className="modal-header">
          <button type="button" className="close" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="modal-body">
          <h2 className="my" style={{ marginBottom: "20px" }}>Feel free to select clips with the Enthusiasts</h2>

          <h5 className="block-title p-0"> Selected Clips<label className="badge badge-primary sm ml-2">{selectedClips?.length}</label></h5>
          <div className={`block-content`} style={{ marginTop: "10px" }}>
            <div className="row">
              {selectedClips?.map((clp) => (
                <div key={clp?._id} style={{ borderRadius: 5, position: "relative", border: "1px solid #ebebeb", marginLeft: "15px" }} className={`col-5`}>
                  <video style={{ width: "100%", maxHeight: "200px", height: "100%" }}>
                    <source src={Utils?.generateVideoURL(clp)} type="video/mp4" />
                  </video>
                  <span
                    style={{ position: "absolute", right: -5, top: -3, cursor: "pointer", background: "red", borderRadius: "50%", padding: "0px 6px", color: "#fff" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Use functional form of state updater to ensure correct state
                      setSelectedClips(prevClips => prevClips.filter((video) => video._id !== clp?._id));
                    }}
                  >
                    x
                  </span>
                </div>
              ))}
            </div>
          </div>

          {clips?.length && clips?.map((cl, ind) => (
            <div key={ind} className={`collapse-block ${cl?.show ? "" : "open"}`}>
              <h5 className="block-title pb-0">
                {cl?._id}
                <label className="badge badge-primary sm ml-2">{cl?.clips?.length}</label>
              </h5>
              <div className={`block-content ${cl?.show ? "d-none" : ""}`}>
                <div className="row">
                  {cl?.clips.map((clp, index) => {
                    var sld = selectedClips.find(val => val?._id === clp?._id)
                    return (
                      <div
                        key={index}
                        className={`col-4 `}
                        style={{ borderRadius: 5 }}
                        onClick={() => {
                          const updatedClips = sld
                            ? selectedClips.filter(val => val._id !== clp._id)
                            : [...selectedClips, clp];

                          setSelectedClips(updatedClips);
                        }}
                      >
                        <video
                          style={{ border: `${sld ? "2px" : "0px"} solid green`, width: "100%", maxHeight: "150px", height: "100%" }}
                        >
                          <source src={Utils?.generateVideoURL(clp)} type="video/mp4" />
                        </video>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default ShareModalTrainee;
