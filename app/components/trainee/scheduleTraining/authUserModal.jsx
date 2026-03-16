import React from "react";
import { Modal} from 'reactstrap';
import Auth_SignIn from "../../../../pages/auth/signIn";
import { useAppDispatch, useAppSelector } from "../../../store";
import { authAction, authState } from "../../auth/auth.slice";
import { RxCross2 } from "react-icons/rx";
import { useRouter } from "next/router";
import { routingPaths } from "../../../common/constants";

const AuthUserModal = () => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const {isAuthModalOpen} = useAppSelector(authState);
     
  return (
    <>
      <Modal 
      isOpen={isAuthModalOpen}
      >
       <div
       style={{
        display : 'flex',
        justifyContent : 'flex-end'
       }}
       >
        <RxCross2
            style={{
                fontSize: '25px',
                cursor : 'pointer'
            }}
            onClick={() => {
              dispatch(authAction.updateIsAuthModalOpen(false));
              dispatch(authAction.updateIsRedirectToDashboard(true));
              // Restore original behavior: go to generic dashboard route
              router.push(routingPaths.dashboard);
            }}
        />
       </div>
        <Auth_SignIn
            isRedirect = {false}
        />
      </Modal>
    </>
  );
};

export default AuthUserModal;
