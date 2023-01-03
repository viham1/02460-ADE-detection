import React from "react";
import "antd/dist/antd.min.css";
import "../Styles/App.css";
import { Layout, Menu, Tabs } from "antd";
import { FileSearchOutlined } from "@ant-design/icons";
import MedicalScreening from "./MedicalScreening";

const { Header, Content, Sider } = Layout;

function App() {
  const menuItems = [
    {
      key: "medicalscreening",
      icon: <FileSearchOutlined />,
      label: "Medical screening"
    }
  ];

  return (
    <>
      <Layout style={{ minHeight: "100vh" }}>
        <Header className="header">
          <div className="logo-container">
            <div className="logo">
              <img src="mars.png" />
            </div>
            <div className="logo right">
              <img src="quartica-xs.png" />
            </div>
          </div>
        </Header>
        <Layout className="site-layout">
          <Sider style={{ background: "#fff" }} width={250}>
            <br></br>
            <Menu selectedKeys={["medicalscreening"]} items={menuItems} defaultSelectedKeys={["medicalscreening"]} mode="inline" />
          </Sider>
          <MedicalScreening />
        </Layout>
      </Layout>
    </>
  );
}

export default App;
