import { useState } from "react";
import styles from "../Styles/SearchAI.module.css";
import { LoadingOutlined, FileProtectOutlined, DeploymentUnitOutlined, CloseSquareOutlined, FileSearchOutlined, FileTextOutlined } from "@ant-design/icons";
import { Modal, Layout, Drawer, Input, Tag, Table, Steps, Checkbox, Button } from "antd";
import { popupNotification } from "../helpers";
import axios from "axios";

const { Content } = Layout;
const { Search } = Input;
const { Step } = Steps;

const { TextArea } = Input;

function SearchAI({ wrapper }) {
  const [rowSelected, setRowSelected] = useState();
  const [loading, setLoading] = useState(false);
  const [selectedAbstract, setSelectedAbstract] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dataSource, setDataSource] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [openDrawer, setOpenDrawer] = useState(false);

  const [showDrugs, setShowDrugs] = useState(true);
  const [showEffects, setShowEffects] = useState(true);
  const [showDosages, setShowDosages] = useState(true);

  const [naranjoLoading, setNaranjoLoading] = useState({});
  const [resultsNaranjo, setResultsNaranjo] = useState({});
  const [naranjoModal, setNaranjoModal] = useState(false);
  const [selectedNaranjo, setSelectedNaranjo] = useState([]);
  const [selectedPair, setSelectedPair] = useState({});

  const filtersReference = dataSource.map((x) => ({ text: x.reference, value: x.reference }));
  const uniquefiltersReference = [...new Map(filtersReference.map((v) => [v.value, v])).values()];

  const scoreNaranjo = [
    { id: 1, Yes: 1, No: 0, "Do not know": 0 },
    { id: 2, Yes: 2, No: -1, "Do not know": 0 },
    { id: 3, Yes: 1, No: 0, "Do not know": 0 },
    { id: 4, Yes: 2, No: -1, "Do not know": 0 },
    { id: 5, Yes: -1, No: +2, "Do not know": 0 },
    { id: 6, Yes: -1, No: +1, "Do not know": 0 },
    { id: 7, Yes: 1, No: 0, "Do not know": 0 },
    { id: 8, Yes: 1, No: 0, "Do not know": 0 },
    { id: 9, Yes: 1, No: 0, "Do not know": 0 },
    { id: 10, Yes: 1, No: 0, "Do not know": 0 }
  ];

  const columnsNaranjo = [
    {
      title: "#",
      dataIndex: "id",
      key: "id",
      width: "4%"
    },
    {
      title: "Question",
      dataIndex: "question",
      key: "question",
      width: "20%"
    },
    {
      title: "AI answer",
      dataIndex: "answer",
      key: "answer",
      width: "20%"
    },
    {
      title: "AI label",
      dataIndex: "answer_label",
      key: "answer_label",
      width: "5%",
      align: "center",
      render: (_, record) => {
        if (record.answer_label === "Yes") {
          return <Tag color="#87d068">Yes</Tag>;
        } else if (record.answer_label === "No") {
          return <Tag color="#f50">No</Tag>;
        } else {
          return <Tag color="rgb(137 137 137)">Do not know</Tag>;
        }
      }
    },
    {
      title: "AI confidence",
      dataIndex: "confidence_label",
      key: "confidence_label",
      width: "5%",
      render: (_, record) => Number(record.confidence_label).toFixed(2)
    },
    {
      title: "Naranjo score",
      key: "naranjo_score",
      width: "5%",
      render: (_, record) => {
        let obj = scoreNaranjo.find((e) => e.id === record.id);
        return obj[record.answer_label];
      }
    }
  ];
  const columnsRelations = [
    {
      title: "Suspect drug",
      dataIndex: "drug",
      key: "drug",
      width: "5%"
    },
    {
      title: "Adverse event",
      dataIndex: "reaction",
      key: "reaction",
      width: "5%",
      ellipsis: true
    },
    {
      title: "Predicted causality",
      dataIndex: "relevance",
      key: "relevance",
      width: "5%",
      align: "center"
    },
    {
      title: "AI confidence",
      dataIndex: "score_adverse",
      key: "score_adverse",
      width: "5%",
      align: "center",
      render: (_, record) => Number(record.score_adverse).toFixed(2)
    },

    {
      title: "Naranjo scale",
      dataIndex: "naranjo",
      key: "naranjo",
      width: "5%",
      align: "center",
      render: (_, record) =>
        naranjoLoading[record.id + selectedAbstract.id] ? (
          <LoadingOutlined
            style={{
              fontSize: 24
            }}
            spin
          />
        ) : resultsNaranjo[record.id + selectedAbstract.id] ? (
          <a href={"#"}>
            <Tag
              onClick={() => {
                setNaranjoModal(true);
                setSelectedNaranjo(resultsNaranjo[record.id + selectedAbstract.id]);
              }}
              icon={<FileTextOutlined />}
              color="#07b020"
            >
              Results
            </Tag>
          </a>
        ) : (
          <a href={"#"}>
            <Tag
              onClick={() =>
                handleNaranjoQuestion(
                  record.id + selectedAbstract.id,
                  selectedAbstract?.analysis.relations.find((e) => e.id === record.id)
                )
              }
              icon={<FileTextOutlined />}
              color="#2db7f5"
            >
              Run
            </Tag>
          </a>
        )
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action",
      width: "5%",
      render: (_, record) => (
        <a href={""} rel="noreferrer">
          <Tag icon={<CloseSquareOutlined />} color="rgb(137 137 137)">
            Mark irrelevant
          </Tag>
        </a>
      )
    }
  ];
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: "5%"
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      filters: uniquefiltersReference,
      ellipsis: true,
      width: "45%",
      onFilter: (value, record) => record.reference === value
    },
    {
      title: "Database",
      dataIndex: "database",
      key: "database",
      width: "6%",
      filters: uniquefiltersReference,
      onFilter: (value, record) => record.reference === value
    },
    {
      title: "Journal",
      dataIndex: "journal",
      key: "journal",
      width: "20%",
      filters: uniquefiltersReference,
      ellipsis: true,
      onFilter: (value, record) => record.reference === value
    },
    {
      title: "Tag",
      dataIndex: "tags",
      key: "tags",
      render: (_, record) => (record.suspected_AE === "suspected ADE" ? <Tag color="#cd201f">AI Suspected ADE</Tag> : <></>)
    },
    {
      title: "Publication date",
      dataIndex: "publication_date",
      key: "publication_date",
      render: (_, record) => (!record.publication_date ? "" : record.publication_date?.Day + "/" + record.publication_date?.Month + "/" + record.publication_date?.Year)
    }
  ];

  const handleNaranjoQuestion = (id, pair) => {
    setNaranjoLoading({ ...naranjoLoading, [id]: true });

    let url = `/api/naranjo`;

    axios({
      method: "post",
      url: url,
      data: { pair: pair, abstract: selectedAbstract.abstract },
      headers: { "Content-Type": "application/json" }
    })
      .then(function (response) {
        console.log(response.data.data);
        setNaranjoLoading({ ...naranjoLoading, [id]: false });
        setResultsNaranjo({ ...resultsNaranjo, [id]: response.data.data });
      })
      .catch(function (error) {
        popupNotification(error.response?.data?.message ? error.response.data.message : error.message, "error");
        console.log(error);
        setNaranjoLoading({ ...naranjoLoading, [id]: false });
      });
  };

  const computeScore = () => {
    let score = 0;
    console.log(typeof selectedNaranjo);
    selectedNaranjo.forEach((element) => {
      let obj = scoreNaranjo.find((e) => e.id === element.id);
      score = score + obj[element.answer_label];
    });

    let label = "";

    if (score >= 9) {
      label = "Definite";
    } else if (score >= 5) {
      label = "Probable";
    } else if (score >= 1) {
      label = "Possible";
    } else {
      label = "Doubtful";
    }

    return { score: score, label: label };
  };

  const handleLoadJSON = () => {
    setResultsNaranjo({});
    setSelectedNaranjo([]);
    setLoading(true);
    fetch("data.json", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    })
      .then((response) => response.json())
      .then((result) => {
        setDataSource(result.data);
        setLoading(false);
        popupNotification(`${result.data.length} abstracts have been successfully analyzed`, "validation");
      });
  };

  const fetchAbstracts = () => {
    setResultsNaranjo({});
    setSelectedNaranjo([]);
    let url = "";
    if (!searchTerm) {
      popupNotification("No search term", "info");
      return 0;
    }
    url = `/api/abstracts?search=${searchTerm}`;
    setLoading(true);
    axios
      .get(url)
      .then((response) => {
        setDataSource(response.data.data);
        setLoading(false);
        popupNotification(`${response.data.data.length} abstracts have been successfully analyzed`, "validation");
      })
      .catch((error) => {
        popupNotification(error.response?.data?.message ? error.response.data.message : error.message, "error");
        console.log(error);
        setLoading(false);
      });
  };

  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const onChangeDrugs = (e) => {
    setShowDrugs((prevCheck) => !prevCheck);
  };
  const onChangeEffects = (e) => {
    setShowEffects((prevCheck) => !prevCheck);
  };

  const onChangeDosages = (e) => {
    setShowDosages((prevCheck) => !prevCheck);
  };

  const getStartEnd = (abstract, sentence) => [abstract.indexOf(sentence), abstract.indexOf(sentence) + sentence.length - 1];

  const generateHTMLTags = (abstract, spans, drugs = true, effects = true, dosage = true) => {
    let html = "";
    let index_string = 0;

    const sentence = "";

    const start_sent = getStartEnd(abstract, sentence)[0];
    const end_sent = getStartEnd(abstract, sentence)[1];
    console.log(start_sent, end_sent);

    for (var i = 0; i < spans.length; i++) {
      let char_start = spans[i].char_start;
      let char_end = spans[i].char_end;
      let label = spans[i].label;

      html += abstract.slice(index_string, char_start);
      if (!drugs && label == "DRUG") {
        html += abstract.slice(char_start, char_end);
        index_string = char_end;
        if (i === spans.length - 1) {
          html += abstract.slice(char_end, abstract.length);
        }
        continue;
      }

      if (!dosage && label == "DOSAGE") {
        html += abstract.slice(char_start, char_end);
        index_string = char_end;
        if (i === spans.length - 1) {
          html += abstract.slice(char_end, abstract.length);
        }
        continue;
      }

      if (!effects && label == "EFFECT") {
        html += abstract.slice(char_start, char_end);
        index_string = char_end;
        if (i === spans.length - 1) {
          html += abstract.slice(char_end, abstract.length);
        }
        continue;
      }

      switch (label) {
        case "DRUG":
          html += '<mark class="drug" style="color: white;background: #6d6af1; padding: 0.1em 0.6em; margin: 0 0.1em; line-height: 1; border-radius: 5px;">';
          break;
        case "EFFECT":
          html += '<mark class="effect"  style="color: white; background: #f16a6a; padding: 0.1em 0.6em; margin: 0 0.1em; line-height: 1; border-radius: 5px;">';
          break;
        case "DOSAGE":
          html += '<mark class="dosage"  style="color: white; background: #4cc611; padding: 0.1em 0.6em; margin: 0 0.1em; line-height: 1; border-radius: 5px;">';
          break;
        default:
          break;
      }
      html += abstract.slice(char_start, char_end);
      switch (label) {
        case "DRUG":
          html += ` <span class="drug" style="font-size: 0.8em; font-weight: bold; line-height: 1; border-radius: 5px; vertical-align: middle; margin-left: 0.5rem">${label}</span> `;
          break;
        case "EFFECT":
          html += ` <span class="effect" style="font-size: 0.8em; font-weight: bold; line-height: 1; border-radius: 5px; vertical-align: middle; margin-left: 0.5rem">${label}</span> `;
          break;
        case "DOSAGE":
          html += ` <span class="dosage" style="font-size: 0.8em; font-weight: bold; line-height: 1; border-radius: 5px; vertical-align: middle; margin-left: 0.5rem">${label}</span> `;
          break;
        default:
          break;
      }

      html += "</mark>";
      index_string = char_end;

      if (i === spans.length - 1) {
        html += abstract.slice(char_end, abstract.length);
      }
    }

    if (!effects && !drugs && !dosage) {
      return abstract;
    }

    return html;
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange
  };

  console.log(wrapper.current);
  return (
    <>
      <Content style={{ margin: "0px", height: "100%", width: "100%" }}>
        <div className={styles.wrapper}>
          <Drawer
            maskStyle={{ opacity: "0" }}
            placement="right"
            closable={false}
            width={890}
            getContainer={() => wrapper.current}
            onClose={() => {
              setOpenDrawer(false);
            }}
            visible={openDrawer}
            destroyOnClose={true}
            style={{ position: "absolute" }}
          >
            <div className={styles.details_container}>
              <Steps>
                <Step title="Analysis" />
                <Step title="Medical Review" />
                <Step title="Approval" />
              </Steps>
              <br></br>
              <div className={styles.buttons_container}>
                <Button onClick={() => {}} type="primary" icon={<FileSearchOutlined />} size="small" style={{ background: "#07b020", borderColor: "#07b020", marginLeft: "10px" }}>
                  Send for medical review
                </Button>
                <Button
                  onClick={() => {}}
                  type="primary"
                  icon={<FileSearchOutlined />}
                  size="small"
                  style={{ background: "rgb(137 137 137)", borderColor: "rgb(137 137 137)", marginLeft: "10px" }}
                >
                  Mark as non-relevant article
                </Button>
              </div>
              <div className={styles.abstract_container}>
                <div className={styles.text_container}>
                  <h3 style={{ marginBottom: "10px" }}>{selectedAbstract?.title}</h3>
                  {selectedAbstract?.abstract && (
                    <div
                      style={{ lineHeight: "24px", textAlign: "justify" }}
                      dangerouslySetInnerHTML={{ __html: generateHTMLTags(selectedAbstract.abstract, selectedAbstract?.analysis.spans, showDrugs, showEffects, showDosages) }}
                    ></div>
                  )}
                </div>
                <div className={styles.filters}>
                  <Checkbox checked={showDrugs} onChange={onChangeDrugs} className="blue">
                    Drug labels
                  </Checkbox>
                  <Checkbox checked={showEffects} onChange={onChangeEffects} className="red">
                    Effects labels
                  </Checkbox>
                  <Checkbox checked={showDosages} onChange={onChangeDosages} className="green">
                    Dosage
                  </Checkbox>
                </div>
              </div>
              <br></br>
              <TextArea style={{ width: "700px" }} rows={4} placeholder="Initial comment" maxLength={6} />
              <h3 style={{ marginTop: "25px", marginBottom: "15px" }}>
                <DeploymentUnitOutlined /> {" " + "AI relationship and causality assessment"}
              </h3>
              <Table
                pagination={{ pageSize: 5 }}
                size="small"
                dataSource={selectedAbstract?.analysis.relations}
                columns={columnsRelations}
                locale={{ emptyText: "No data" }}
                onRow={(record, rowIndex) => {
                  return {
                    onClick: (event) => {
                      setSelectedPair(record);
                    }
                  };
                }}
              />
            </div>
          </Drawer>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
            <Search onChange={(e) => setSearchTerm(e.target.value)} onSearch={fetchAbstracts} placeholder="Search MeSH - Drug name, reactions, etc..." style={{ width: "92%" }} />
            <Button onClick={() => handleLoadJSON()} type="primary" size="small" style={{ background: "#07b020", borderColor: "#07b020", marginLeft: "10px" }}>
              Load JSON
            </Button>
          </div>

          <Table
            pagination={{ pageSize: 18 }}
            rowSelection={rowSelection}
            size="small"
            rowClassName={(record, index) => (index == rowSelected ? "ant-table-row-selected" : "")}
            rowKey="id"
            loading={{
              indicator: (
                <LoadingOutlined
                  style={{
                    fontSize: 24
                  }}
                  spin
                />
              ),
              spinning: loading
            }}
            dataSource={dataSource}
            columns={columns}
            locale={{ emptyText: "No data" }}
            onRow={(record, rowIndex) => {
              return {
                onClick: (event) => {
                  setSelectedAbstract(record);
                  setRowSelected(rowIndex);
                  setOpenDrawer(true);
                }
              };
            }}
          />
        </div>
      </Content>
      <Modal
        style={{ top: 100 }}
        forceRender
        title={
          <div className={styles.naranjo_title_container}>
            <h3>
              <FileProtectOutlined />
              {" " + "Naranjo scale - AI assessment"}
            </h3>

            <h4>
              {selectedPair?.drug && selectedPair?.reaction
                ? "Pair: " +
                  selectedPair?.drug.charAt(0).toUpperCase() +
                  selectedPair?.drug.slice(1) +
                  " - " +
                  selectedPair?.reaction.charAt(0).toUpperCase() +
                  selectedPair?.reaction.slice(1)
                : ""}
            </h4>
          </div>
        }
        visible={naranjoModal}
        destroyOnClose={true}
        onCancel={() => {
          setNaranjoModal(false);
        }}
        width={1400}
      >
        <Table pagination={false} size="small" dataSource={selectedNaranjo} columns={columnsNaranjo} locale={{ emptyText: "No data" }} />
        <br></br>
        <h3>
          Predicted score :{" "}
          <Tag style={{ fontSize: "15px" }} color="#87d068">
            {computeScore()["label"]} ({computeScore()["score"]})
          </Tag>
        </h3>
      </Modal>
    </>
  );
}

export default SearchAI;
