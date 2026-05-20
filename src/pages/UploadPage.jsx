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

function getFirst(record, keys) {
  for (const key of keys) {
    const value = record?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function getByContains(record, keywords) {
  const keys = Object.keys(record || {});

  for (const key of keys) {
    const lowerKey = key.toLowerCase();

    const ok = keywords.every((kw) =>
      lowerKey.includes(String(kw).toLowerCase())
    );

    if (ok) {
      const value = record[key];

      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }
  }

  return "";
}

function getShortName(record) {
  return (
    getFirst(record, [
      "ten_goi_vat_tu",
      "Tên gọi vật tư",
      "Tên gọi vật tư(*) Cột cần sửa",
      "src_Tên gọi vật tư",
      "src_Tên gọi vật tư(*) Cột cần sửa",
      "src_ten_goi_vat_tu",
    ]) ||
    getByContains(record, ["tên gọi", "vật tư"]) ||
    getByContains(record, ["ten goi", "vat tu"])
  );
}

function getFullName(record) {
  return (
    getFirst(record, [
      "ten_vat_tu_chuan",
      "Tên vật tư chuẩn hóa",
      "Tên vật tư chuẩn hóa không giới hạn ký tự Cột cần sửa",
      "Mô tả Tên hàng hóa, dịch vụ CHUẨN HÓA",
      "src_Tên vật tư chuẩn hóa",
      "src_Tên vật tư chuẩn hóa không giới hạn ký tự Cột cần sửa",
      "src_Mô tả Tên hàng hóa, dịch vụ CHUẨN HÓA",
      "src_ten_vat_tu_chuan",
    ]) ||
    getByContains(record, ["chuẩn hóa"]) ||
    getByContains(record, ["chuan hoa"])
  );
}

function getErrorValue(record) {
  return (
    getFirst(record, [
      "loi_can_sua",
      "Lỗi cần sửa",
      "errors",
      "error",
      "loi",
      "src_loi_can_sua",
    ]) ||
    getByContains(record, ["lỗi"]) ||
    getByContains(record, ["loi"])
  );
}

function getWarningValue(record) {
  return (
    getFirst(record, [
      "canh_bao",
      "Cảnh báo",
      "warnings",
      "warning",
      "src_canh_bao",
    ]) ||
    getByContains(record, ["cảnh báo"]) ||
    getByContains(record, ["canh bao"])
  );
}

function getCol(record, keys, containsList = []) {
  const direct = getFirst(record, keys);

  if (direct) return direct;

  for (const keywords of containsList) {
    const value = getByContains(record, keywords);

    if (value) return value;
  }

  return "";
}

function normalizeStatus(record) {
  const raw = getFirst(record, ["status", "Status", "trang_thai", "Trạng thái"]);
  const errorValue = getErrorValue(record);
  const warningValue = getWarningValue(record);

  if (raw) return raw;

  if (errorValue) return "CAN_TAO_MOI_NHUNG_CAN_SUA";
  if (warningValue) return "CAN_TAO_MOI_CAN_XEM_LAI";

  return "CAN_TAO_MOI_DAT";
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
      (x) => normalizeStatus(x) === "CAN_TAO_MOI_NHUNG_CAN_SUA"
    ).length;

    const needReview = data.filter(
      (x) => normalizeStatus(x) === "CAN_TAO_MOI_CAN_XEM_LAI"
    ).length;

    const ok = data.filter(
      (x) => normalizeStatus(x) === "CAN_TAO_MOI_DAT"
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
      onFilter: (value, record) => normalizeStatus(record) === value,
      render: (_, record) => <StatusTag status={normalizeStatus(record)} />,
    },
    {
      title: "Lỗi cần sửa",
      dataIndex: "loi_can_sua",
      width: 360,
      render: (_, record) => <MessageList value={getErrorValue(record)} type="error" />,
    },
    {
      title: "Cảnh báo",
      dataIndex: "canh_bao",
      width: 420,
      render: (_, record) => <MessageList value={getWarningValue(record)} type="warning" />,
    },
    {
      title: "Tên ngắn / tên gọi vật tư",
      dataIndex: "ten_goi_vat_tu",
      width: 420,
      render: (_, record) => safeText(getShortName(record)),
    },
    {
      title: "Tên dài / tên chuẩn hóa",
      dataIndex: "ten_vat_tu_chuan",
      width: 520,
      render: (_, record) => safeText(getFullName(record)),
    },
    {
      title: "ĐVT hiện tại",
      dataIndex: "don_vi_hien_tai",
      width: 130,
      render: (_, record) =>
        safeText(
          getCol(
            record,
            ["don_vi_hien_tai", "src_Đơn vị tính hiện tại"],
            [["đơn vị", "hiện tại"], ["don vi", "hien tai"]]
          )
        ),
    },
    {
      title: "ĐVT SAP",
      dataIndex: "don_vi_sap",
      width: 130,
      render: (_, record) =>
        safeText(
          getCol(
            record,
            ["don_vi_sap", "src_Đơn vị tính chính(*) cho vào SAP"],
            [["đơn vị", "sap"], ["don vi", "sap"]]
          )
        ),
    },
    {
      title: "Mã Dòng",
      dataIndex: "ma_dong",
      width: 110,
      render: (_, record) =>
        safeText(getCol(record, ["ma_dong", "material_type", "src_Mã Dòng"], [["mã dòng"], ["ma dong"]])),
    },
    {
      title: "Mã Loại",
      dataIndex: "ma_loai",
      width: 110,
      render: (_, record) =>
        safeText(getCol(record, ["ma_loai", "material_group", "src_Mã Loại"], [["mã loại"], ["ma loai"]])),
    },
    {
      title: "Mô tả Loại chuẩn hóa",
      dataIndex: "mo_ta_loai",
      width: 260,
      render: (_, record) =>
        safeText(
          getCol(
            record,
            [
              "mo_ta_loai_chuan_hoa",
              "src_Mô tả Loại hàng hóa, dịch vụ CHUẨN HÓA",
              "Mô tả Loại hàng hóa, dịch vụ CHUẨN HÓA",
            ],
            [["mô tả", "loại"], ["mo ta", "loai"]]
          )
        ),
    },
    {
      title: "Mã tệp",
      dataIndex: "ma_tep",
      width: 110,
      render: (_, record) =>
        safeText(getCol(record, ["ma_tep", "src_Mã tệp CHUẨN HÓA"], [["mã tệp"], ["ma tep"]])),
    },
    {
      title: "Mô tả Tệp chuẩn hóa",
      dataIndex: "mo_ta_tep",
      width: 260,
      render: (_, record) =>
        safeText(
          getCol(
            record,
            [
              "mo_ta_tep_chuan_hoa",
              "src_Mô tả Tệp hàng hóa, dịch vụ CHUẨN HÓA",
              "Mô tả Tệp hàng hóa, dịch vụ CHUẨN HÓA",
            ],
            [["mô tả", "tệp"], ["mo ta", "tep"]]
          )
        ),
    },
    {
      title: "Ngành hàng",
      dataIndex: "nganh_hang",
      width: 130,
      render: (_, record) =>
        safeText(getCol(record, ["nganh_hang", "src_Ngành hàng"], [["ngành hàng"], ["nganh hang"]])),
    },
    {
      title: "Trung tâm lợi nhuận",
      dataIndex: "trung_tam_loi_nhuan",
      width: 150,
      render: (_, record) =>
        safeText(getCol(record, ["trung_tam_loi_nhuan", "src_Trung tâm lợi nhuận"], [["trung tâm", "lợi nhuận"], ["trung tam", "loi nhuan"]])),
    },
    {
      title: "Phân loại SAP",
      dataIndex: "phan_loai_sap",
      width: 160,
      render: (_, record) =>
        safeText(getCol(record, ["phan_loai_sap", "src_Phân loại hàng hóa trong SAP (*)"], [["phân loại", "sap"], ["phan loai", "sap"]])),
    },
    {
      title: "Dòng hàng hóa",
      dataIndex: "dong_hang_hoa",
      width: 150,
      render: (_, record) =>
        safeText(getCol(record, ["dong_hang_hoa", "src_Dòng hàng hóa (*)"], [["dòng hàng"], ["dong hang"]])),
    },
    {
      title: "Loại lô",
      dataIndex: "loai_lo",
      width: 120,
      render: (_, record) =>
        safeText(getCol(record, ["loai_lo", "src_Loại lô (*)"], [["loại lô"], ["loai lo"]])),
    },
    {
      title: "TK hạch toán doanh thu",
      dataIndex: "tk_doanh_thu",
      width: 180,
      render: (_, record) =>
        safeText(getCol(record, ["tk_doanh_thu", "src_Nhóm tài khoản hạch toán doanh thu (*)"], [["hạch toán", "doanh thu"], ["hach toan", "doanh thu"]])),
    },
    {
      title: "TK hạch toán tự động",
      dataIndex: "tk_tu_dong",
      width: 180,
      render: (_, record) =>
        safeText(getCol(record, ["tk_tu_dong", "src_Nhóm tài khoản hạch toán tự động (*)"], [["hạch toán", "tự động"], ["hach toan", "tu dong"]])),
    },
    {
      title: "Phương pháp tính giá",
      dataIndex: "phuong_phap_tinh_gia",
      width: 170,
      render: (_, record) =>
        safeText(getCol(record, ["phuong_phap_tinh_gia", "src_Phương pháp tính giá (*)"], [["phương pháp", "tính giá"], ["phuong phap", "tinh gia"]])),
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
    const status = normalizeStatus(record);

    if (status === "CAN_TAO_MOI_NHUNG_CAN_SUA") {
      return "row-error";
    }

    if (status === "CAN_TAO_MOI_CAN_XEM_LAI") {
      return "row-warning";
    }

    if (status === "CAN_TAO_MOI_DAT") {
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


        </Space>
      </Card>

      {summary ? (
        <Alert
          className="mb-4"
          type={summary.type}
          showIcon
          message={summary.message}
          description={summary.hint || ""}
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
            scroll={{ x: 4300, y: 600 }}
            bordered
            rowClassName={rowClassName}
            size="small"
          />
        </Spin>
      </Card>
    </div>
  );
}
