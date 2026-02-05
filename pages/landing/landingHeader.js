import React, { useEffect, useState } from "react";
import {
  Nav,
  NavItem,
  Dropdown,
  DropdownItem,
  DropdownToggle,
  DropdownMenu,
  NavLink,
  Collapse,
  Container,
  Row,
  Col,
  Navbar,
} from "reactstrap";
import { useRouter } from "next/router";
import Link from "next/link";
import { routingPaths } from "../../app/common/constants";
const headerArr = [
  { path: "/auth/signUp", name: "Join as an Expert" },
  { path: "", name: "Contact Us" },
  { path: "", name: "About Us" },
];
import { useMediaQuery } from "usehooks-ts";

const LandingHeader = (masterRecords) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  const toggle = () => setDropdownOpen(!dropdownOpen);
  const [isMenuOpen, setIsMenuOpen] = useState(false);


  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const isMobileScreen = useMediaQuery("(max-width: 1000px)");


  return (
    <React.Fragment>
      <div
        className="row d-flex justify-content-between"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          backgroundColor: "white",
          margin: 0,
          paddingBottom: isMobileScreen?"5px":"20px",
          flexWrap:"nowrap"
        }}
      >
        <div className={``}>
          <img
            src="/assets/images/netquix_logo_beta.png"
            alt="logo"
            className="header-image-logo "
            style={{
              marginTop:isMobileScreen?"":"15px",
               marginLeft:isMobileScreen?"10px":"20px"
            }}

          />
        </div>
        <div className={``}>
        
          <Collapse
            className={`show`}
            id="navbarNav"
          >
            <Nav
              
              className={`border-0 d-flex mr-2 navbaritem ${isMenuOpen ? "d-none" : "" // Hide the Nav when the menu is open
                }`}
              style={{
                marginTop: isMobileScreen?"10px":"40px",
              
              }}
            >
              {!isMobileScreen &&
                <>
              <Dropdown nav isOpen={dropdownOpen} toggle={toggle} className="categories-dropdown">
                <DropdownToggle
                  nav
                  caret
                  className="categories-dropdown-toggle"
                >
                  Categories
                </DropdownToggle>
                <DropdownMenu className="categories-dropdown-menu">
                  {masterRecords?.masterRecords?.category?.map((cat, index) => {
                    return (
                      <DropdownItem
                        key={`master_data${index}`}
                        className="categories-dropdown-item"
                      >
                        {cat}
                      </DropdownItem>
                    );
                  })}
                </DropdownMenu>
              </Dropdown>
              {headerArr.map((name, index) => {
                return (
                  <NavItem key={`headers-${index}`}>
                    <NavLink
                      href={name.path}
                      style={{ fontSize: "16px", color: "grey" }}
                    >
                      {name.name}
                    </NavLink>
                  </NavItem>
                );
              })}
              </>}

              <div className="d-flex gap-5">

              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{
                  width: "82px",
                  padding: "11px",
                  alignItems: "center",
                  fontSize: isMobileScreen?"10px":"14px",
                  color: "white",
                  cursor: "pointer",
                }}
                onClick={() => router.push(routingPaths.signUp)}
              >
                Sign Up
              </button>
              <button
                type="button"
                className="mt-xs-5 btn btn-primary btn-sm"
                style={{
                  width: "82px",
                  padding: "11px",
                  marginright: "5px",
                  marginLeft: "5px",
                  alignItems: "center",
                  fontSize: isMobileScreen?"10px":"14px",
                  color: "white !important",
                  cursor: "pointer",
                }}
                onClick={() => router.push(routingPaths.signIn)}
              >
                Login 
              </button>
              </div>
            </Nav>
          </Collapse>
        </div>
      </div>
    </React.Fragment>
  );
};

export default LandingHeader;
