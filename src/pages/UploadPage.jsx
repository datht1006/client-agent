
import {
  Upload,
  Button,
  Table,
  Card,
  Tag,
  message,
  Spin,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function UploadPage() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({ total: 0, error: 0 });
  const [loading, setLoading] = useState(false);

  // ===== UPLOAD =====
  const handleUpload = async (file) => {
    if (!file) return;

    // limit size
    if (file.size > 5 * 1024 * 1024) {
      message.error("File > 5MB, quá nặng!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) throw new Error("Server error");

      const result = await res.json();

      if (!result?.success) {
        message.error(result?.error || "Parse file thất bại");
        setData([]);
        setSummary({ total: 0, error: 0 });
        return;
      }

      setData(result.data || []);
      setSummary({
        total: result.total || 0,
        error: result.error_count || 0,
      });

      message.success("Upload thành công!");
    } catch (err) {
      console.error(err);

      if (err.name === "AbortError") {
        message.error("Server phản hồi quá lâu (>60s)");
      } else {
        message.error(
          "Không kết nối được BE (Render có thể sleep ~30s 😴, thử lại nhé)"
        );
      }
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
  };

  // ===== COLUMNS =====
  const columns = [
    {
      title: "Dòng",
      dataIndex: "row_excel",
      width: 80,
      fixed: "left",
    },
    {
      title: "Tên gốc",
      dataIndex: "ten_goc",
      width: 220,
      render: (text) => text || "--",
    },
    {
      title: "Tên chuẩn nhập",
      dataIndex: "ten_chuan",
      width: 220,
      render: (text) => text || "--",
    },
    {
      title: "Material Description",
      dataIndex: "material_description",
      width: 250,
      render: (text) => (
        <span className="text-blue-600 font-semibold">
          {text || "--"}
        </span>
      ),
    },
    {
      title: "Basic",
      dataIndex: "basic",
      width: 150,
      render: (text) => (
        <span className="text-purple-600">
          {text || "--"}
        </span>
      ),
    },
    {
      title: "So sánh",
      width: 260,
      render: (_, record) => (
        <div className="text-xs">
          <div className="text-red-500">
            ❌ {record?.ten_chuan || "--"}
          </div>
          <div className="text-green-600">
            ✅ {record?.material_description || "--"}
          </div>
        </div>
      ),
    },
    {
      title: "Score",
      dataIndex: "score",
      width: 100,
      render: (score) => {
        if (score === null || score === undefined) {
          return <Tag>--</Tag>;
        }

        let color = "red";
        if (score > 0.9) color = "green";
        else if (score > 0.75) color = "orange";

        return <Tag color={color}>{score.toFixed(2)}</Tag>;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 120,
      render: (status) =>
        status === "OK" ? (
          <Tag color="green">OK</Tag>
        ) : (
          <Tag color="red">ERROR</Tag>
        ),
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-gradient-to-b from-[#0b2c4d] to-[#123e6b]">
      {/* TITLE */}
      <h2 className="text-white text-2xl mb-4 font-bold">
        📂 Check mã vật tư AI
      </h2>

      {/* UPLOAD */}
      <Card className="mb-4">
        <Upload {...props}>
          <Button icon={<UploadOutlined />} loading={loading}>
            Upload file Excel
          </Button>
        </Upload>
      </Card>

      {/* SUMMARY */}
      <Card className="mb-4">
        <div className="flex gap-10 text-base">
          <p>
            Tổng dòng:{" "}
            <span className="font-bold text-blue-600">
              {summary.total}
            </span>
          </p>
          <p>
            Lỗi:{" "}
            <span className="font-bold text-red-500">
              {summary.error}
            </span>
          </p>
        </div>
      </Card>

      {/* TABLE */}
      <Card title="📊 Kết quả kiểm tra">
        <Spin spinning={loading}>
          <Table
            dataSource={data || []}
            columns={columns}
            rowKey={(r) => `${r.row_excel}-${r.ten_goc}`}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1400 }}
            bordered
            rowClassName={(record) =>
              record.status === "ERROR"
                ? "bg-red-100"
                : "bg-green-50"
            }
          />
        </Spin>
      </Card>
    </div>
  );
}

