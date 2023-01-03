import { useRef } from "react";
import React from "react";
import styles from "../Styles/MedicalScreening.module.css";
import { Layout, Tabs } from "antd";
import { SearchOutlined, InboxOutlined, AuditOutlined, BookOutlined } from "@ant-design/icons";
import SearchAI from "./SearchAI";

function MedicalScreening() {
  const wrapper = useRef(null);

  const items = [
    {
      label: (
        <span>
          <SearchOutlined />
          AI Search
        </span>
      ),
      key: "1",
      children: <SearchAI wrapper={wrapper} />
    },
    {
      label: (
        <span>
          <InboxOutlined />
          Inbox with AI Analysis
        </span>
      ),
      key: "2",
      children: "Test"
    },
    {
      label: (
        <span>
          <AuditOutlined />
          Review & Approval
        </span>
      ),
      key: "3",
      children: "Test"
    },
    {
      label: (
        <span>
          <BookOutlined />
          Screening responsabilities
        </span>
      ),
      key: "4",
      children: "Test"
    }
  ];

  return (
    <>
      <Layout className={styles.site_content} ref={wrapper} style={{ position: "relative" }}>
        <div className={styles.wrapper}>
          <Tabs style={{ width: "100%" }} items={items} type="card" defaultActiveKey="1"></Tabs>
        </div>
      </Layout>
    </>
  );
}

export default MedicalScreening;
