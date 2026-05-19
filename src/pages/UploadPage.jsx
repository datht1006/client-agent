import {
  Upload,
  Button,
  Table,
  Card,
  message,
  Spin,
  Tag,
  Space,
  Typography,
  Alert,
  Statistic,
  Row,
  Col,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";

const { Text } = Typography;

const API_URL = import.meta.env.VITE_API_URL;

const STATUS_CONFIG = {
  CAN_TAO_MOI_DAT: {
    color: "green",
    label: "ĐẠT",
  },
  CAN_TAO_MOI_CAN_XEM_LAI: {
    color: "orange",
    label: "CẦN XEM LẠI",
  },
  CAN_TAO_MOI_NHUNG_CAN_SUA: {
    color: "red",
    label: "CẦN SỬA",
  },
};

function safeText(value) {
  if (value === null || value === undefined || value === "") return "--";
  return String(value);
}

function splitMessage(value) {
  if (!value) return [];
  return String(value)
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
}

function StatusTag({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    color: "default",
    label: status || "KHÔNG RÕ",
  };

  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

function MessageList({ value, type = "error" }) {
  const items = splitMessage(value);

  if (!items.length) {
    return <Text type="secondary">--</Text>;
  }

  const color = type === "error" ? "red" : "orange";

  return (
    <Space direction="vertical" size={2}>
      {items.map((item, idx) => (
        <Tag key={idx} color={color} style={{ whiteSpace: "normal" }}>
          {item}
        </Tag>
      ))}
    </Space>
  );
}

export default function UploadPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const stats = useMemo(() => {
    const total = data.length;

    const needFix = data.filter(
      (x) => x.status === "CAN_TAO_MOI_NHUNG_CAN_SUA"
    ).length;

    const needReview = data.filter(
      (x) => x.status === "CAN_TAO_MOI_CAN_XEM_LAI"
    ).length;

    const ok = data.filter(
      (x) => x.status === "CAN_TAO_MOI_DAT"
    ).length;

    return {
      total,
      ok,
      needReview,
      needFix,
    };
  }, [data]);

  // ===== UPLOAD =====
  const handleUpload = async (file) => {
    if (!file) return;

    if (!API_URL) {
      message.error("Thiếu VITE_API_URL trong file .env FE");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setData([]);
    setSummary(null);

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!result?.success) {
        message.error(result?.error || "Parse lỗi");
        setSummary({
          type: "error",
          message: result?.error || "Upload/check thất bại",
          hint: result?.hint || "",
        });
        return;
      }

      setData(result.data || []);
      setSummary({
        type: "success",
        message: `Upload OK. Tổng dòng cần check: ${result.total || 0}`,
        outputFile: result.output_file,
      });

      message.success("Upload OK");
    } catch (err) {
      console.error(err);
      message.error("Lỗi kết nối BE");
      setSummary({
        type: "error",
        message: "Lỗi kết nối BE",
        hint: String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  const props = {
    beforeUpload: (file) => {
      handleUpload(file);
      return false;
    },
    showUploadList: false,
    accept: ".xlsx,.xls",
  };

  const columns = [
    {
      title: "Dòng",
      dataIndex: "row_excel",
      width: 80,
      fixed: "left",
      render: (v) => <Text strong>{safeText(v)}</Text>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 150,
      fixed: "left",
      filters: [
        { text: "ĐẠT", value: "CAN_TAO_MOI_DAT" },
        { text: "CẦN XEM LẠI", value: "CAN_TAO_MOI_CAN_XEM_LAI" },
        { text: "CẦN SỬA", value: "CAN_TAO_MOI_NHUNG_CAN_SUA" },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: "Lỗi cần sửa",
      dataIndex: "loi_can_sua",
      width: 360,
      render: (v) => <MessageList value={v} type="error" />,
    },
    {
      title: "Cảnh báo",
      dataIndex: "canh_bao",
      width: 420,
      render: (v) => <MessageList value={v} type="warning" />,
    },
    {
      title: "Tên gọi vật tư",
      dataIndex: "ten_goi_vat_tu",
      width: 280,
      ellipsis: true,
      render: (v) => safeText(v),
    },
    {
      title: "Tên chuẩn hóa",
      dataIndex: "ten_vat_tu_chuan",
      width: 320,
      ellipsis: true,
      render: (v) => safeText(v),
    },
    {
      title: "ĐVT hiện tại",
      dataIndex: "don_vi_hien_tai",
      width: 120,
      render: (v) => safeText(v),
    },
    {
      title: "ĐVT SAP",
      dataIndex: "don_vi_sap",
      width: 120,
      render: (v) => safeText(v),
    },
    {
      title: "Loại / Group",
      dataIndex: "material_group",
      width: 180,
      render: (v, record) =>
        safeText(record.mo_ta_loai_chuan_hoa || record.material_group),
    },
    {
      title: "Mã tương tự",
      dataIndex: "similar_material_code",
      width: 150,
      render: (v) =>
        v ? <Tag color="blue">{v}</Tag> : <Text type="secondary">--</Text>,
    },
    {
      title: "Tên tương tự trong master",
      dataIndex: "similar_material_description",
      width: 320,
      ellipsis: true,
      render: (v) => safeText(v),
    },
    {
      title: "Basic data tương tự",
      dataIndex: "similar_basic_data_text",
      width: 320,
      ellipsis: true,
      render: (v) => safeText(v),
    },
    {
      title: "Rule match",
      dataIndex: "matched_rule_name",
      width: 220,
      render: (v, record) => {
        if (!v) return <Text type="secondary">--</Text>;

        return (
          <Space direction="vertical" size={0}>
            <Text>{v}</Text>
            {record.matched_rule_required ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.matched_rule_required}
              </Text>
            ) : null}
          </Space>
        );
      },
    },
  ];

  const rowClassName = (record) => {
    if (record.status === "CAN_TAO_MOI_NHUNG_CAN_SUA") {
      return "row-error";
    }

    if (record.status === "CAN_TAO_MOI_CAN_XEM_LAI") {
      return "row-warning";
    }

    if (record.status === "CAN_TAO_MOI_DAT") {
      return "row-ok";
    }

    return "";
  };

  return (
    <div className="p-6 min-h-screen bg-[#0b2c4d]">
      <style>
        {`
          .row-error td {
            background: #fff1f0 !important;
          }

          .row-warning td {
            background: #fffbe6 !important;
          }

          .row-ok td {
            background: #f6ffed !important;
          }

          .ant-table-cell {
            vertical-align: top;
          }
        `}
      </style>

      <h2 className="text-white text-2xl mb-4">
        📂 Check đề nghị tạo mã vật tư
      </h2>

      <Card className="mb-4">
        <Space wrap>
          <Upload {...props}>
            <Button icon={<UploadOutlined />} loading={loading}>
              Upload Excel
            </Button>
          </Upload>

          <Text type="secondary">
            API: {API_URL || "Chưa cấu hình VITE_API_URL"}
          </Text>
        </Space>
      </Card>

      {summary ? (
        <Alert
          className="mb-4"
          type={summary.type}
          showIcon
          message={summary.message}
          description={
            summary.hint ||
            (summary.outputFile ? `Output: ${summary.outputFile}` : "")
          }
        />
      ) : null}

      <Row gutter={16} className="mb-4">
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Tổng dòng" value={stats.total} />
          </Card>
        </Col>

        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Đạt" value={stats.ok} valueStyle={{ color: "#3f8600" }} />
          </Card>
        </Col>

        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Cần xem lại" value={stats.needReview} valueStyle={{ color: "#faad14" }} />
          </Card>
        </Col>

        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Cần sửa" value={stats.needFix} valueStyle={{ color: "#cf1322" }} />
          </Card>
        </Col>
      </Row>

      <Card title="📊 Kết quả check">
        <Spin spinning={loading}>
          <Table
            dataSource={data}
            columns={columns}
            rowKey={(r, i) => `${r.row_excel || "row"}-${i}`}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (total) => `Tổng ${total} dòng`,
            }}
            scroll={{ x: 2600, y: 600 }}
            bordered
            rowClassName={rowClassName}
            size="small"
          />
        </Spin>
      </Card>
    </div>
  );
}
