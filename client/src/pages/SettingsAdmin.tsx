import { useState, useEffect } from "react";
import Breadcrumb from "../components/Breadcrumbs/Breadcrumb";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

const SettingsAdmin = () => {
  const { t } = useTranslation();
  const { loadSettings, updateSettings } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    openai_key: "",
    mistral_key: "",
    llama_key: "",
    mail_username: "",
    mail_password: "",
    mail_host: "",
    mail_port: "",
    mail_from: "",
    mail_from_name: "",
    aws_access_key: "",
    aws_secret_key: "",
    aws_region: "",
    aws_bucket: "",
    aws_bucket_url: "",
  });
  useEffect(() => {
    loadSettingsFn();
  }, []);

  const loadSettingsFn = async () => {
    try {
      const data = await loadSettings();
      setSettings(
        data || {
          openai_key: "",
          mistral_key: "",
          llama_key: "",
          mail_username: "",
          mail_password: "",
          mail_host: "",
          mail_port: "",
          mail_from: "",
          mail_from_name: "",
          aws_access_key: "",
          aws_secret_key: "",
          aws_region: "",
          aws_bucket: "",
          aws_bucket_url: "",
        },
      );
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error(t("common.errorOccurred"));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (section: string) => {
    console.log("handleSubmit", section);
    setLoading(true);
    try {
      let dataToUpdate = {};

      switch (section) {
        case "ai":
          dataToUpdate = {
            openai_key: settings.openai_key,
            mistral_key: settings.mistral_key,
            llama_key: settings.llama_key,
          };
          break;
        case "mail":
          dataToUpdate = {
            mail_username: settings.mail_username,
            mail_password: settings.mail_password,
            mail_host: settings.mail_host,
            mail_port: settings.mail_port,
            mail_from: settings.mail_from,
            mail_from_name: settings.mail_from_name,
          };
          break;
        case "aws":
          dataToUpdate = {
            aws_access_key: settings.aws_access_key,
            aws_secret_key: settings.aws_secret_key,
            aws_region: settings.aws_region,
            aws_bucket: settings.aws_bucket,
            aws_bucket_url: settings.aws_bucket_url,
          };
          break;
      }

      await updateSettings(dataToUpdate);
      toast.success(t("common.savedSuccessfully"));
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error(t("common.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-270">
        <Breadcrumb pageName={t("settingsAdmin.title")} />

        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-5">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  {t("settingsAdmin.AIKeys")}
                </h3>
              </div>
              <div className="p-7">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit("ai");
                  }}
                >
                  <div className="mb-5.5">
                    <div className="w-full">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="openai_key"
                      >
                        {t("settingsAdmin.openAIKey")}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="openai_key"
                          id="openai_key"
                          placeholder="sk-proj-..."
                          value={settings.openai_key}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-5.5">
                    <div className="w-full">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="mistral_key"
                      >
                        {t("settingsAdmin.mistralKey")}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="mistral_key"
                          id="mistral_key"
                          placeholder="a1i2a..."
                          value={settings.mistral_key}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-5.5">
                    <div className="w-full">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="llama_key"
                      >
                        {t("settingsAdmin.llamaKey")}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="llama_key"
                          id="llama_key"
                          placeholder="llx-..."
                          value={settings.llama_key}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-4.5">
                    <button
                      className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                      type="button"
                      onClick={loadSettings}
                    >
                      {t("settingsAdmin.cancelKeys")}
                    </button>
                    <button
                      className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                      type="submit"
                      disabled={loading}
                    >
                      {t("settingsAdmin.saveKeys")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-8 mt-8">
          <div className="col-span-5">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  {t("settingsAdmin.mailSettings")}
                </h3>
              </div>
              <div className="p-7">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit("mail");
                  }}
                >
                  <div className="mb-5.5 flex flex-col gap-5.5 md:flex-row">
                    <div className="w-full md:w-1/2">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="mail_username"
                      >
                        {t("settingsAdmin.mailUsername")}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="mail_username"
                          id="mail_username"
                          placeholder="user@example.com"
                          value={settings.mail_username}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    <div className="w-full md:w-1/2">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="mail_password"
                      >
                        {t("settingsAdmin.mailPassword")}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="password"
                          name="mail_password"
                          id="mail_password"
                          placeholder="password"
                          value={settings.mail_password}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-5.5 flex flex-col gap-5.5 md:flex-row">
                    <div className="w-full md:w-1/2">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="mail_host"
                      >
                        {t("settingsAdmin.mailHost")}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="mail_host"
                          id="mail_host"
                          placeholder="smtp.example.com"
                          value={settings.mail_host}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    <div className="w-full md:w-1/2">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="mail_port"
                      >
                        {t("settingsAdmin.mailPort")}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="mail_port"
                          id="mail_port"
                          placeholder="465"
                          value={settings.mail_port}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-5.5 flex flex-col gap-5.5 md:flex-row">
                    <div className="w-full md:w-1/2">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="mail_from"
                      >
                        {t("settingsAdmin.mailFrom")}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="mail_from"
                          id="mail_from"
                          placeholder="user@example.com"
                          value={settings.mail_from}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    <div className="w-full md:w-1/2">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="mail_from_name"
                      >
                        {t("settingsAdmin.mailFromName")}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="mail_from_name"
                          id="mail_from_name"
                          placeholder="John Doe"
                          value={settings.mail_from_name}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-4.5">
                    <button
                      className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                      type="button"
                      onClick={loadSettings}
                    >
                      {t("settingsAdmin.cancelKeys")}
                    </button>
                    <button
                      className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                      type="submit"
                      disabled={loading}
                    >
                      {t("settingsAdmin.saveKeys")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-8 mt-8">
          <div className="col-span-5">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  {t("settingsAdmin.awsSettings")}
                </h3>
              </div>
              <div className="p-7">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit("aws");
                  }}
                >
                  <div className="mb-5.5 flex flex-col gap-5.5 md:flex-row">
                    <div className="w-full md:w-1/2">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="aws_access_key"
                      >
                        {t("settingsAdmin.awsAccessKey")}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="aws_access_key"
                          id="aws_access_key"
                          placeholder="AOEUIOE..."
                          value={settings.aws_access_key}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    <div className="w-full md:w-1/2">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="aws_secret_key"
                      >
                        {t("settingsAdmin.awsSecretKey")}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="password"
                          name="aws_secret_key"
                          id="aws_secret_key"
                          placeholder="Awoeus..."
                          value={settings.aws_secret_key}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-5.5 flex flex-col gap-5.5 md:flex-row">
                    <div className="w-full md:w-1/2">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="aws_region"
                      >
                        {t("settingsAdmin.awsRegion")}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="aws_region"
                          id="aws_region"
                          placeholder="eu-west-1"
                          value={settings.aws_region}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    <div className="w-full md:w-1/2">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="aws_bucket"
                      >
                        {t("settingsAdmin.awsBucket")}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="aws_bucket"
                          id="aws_bucket"
                          placeholder="my-bucket"
                          value={settings.aws_bucket}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-5.5 flex flex-col gap-5.5 md:flex-row">
                    <div className="w-full md:w-1/2">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="aws_bucket_url"
                      >
                        {t("settingsAdmin.awsBucketUrl")}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="aws_bucket_url"
                          id="aws_bucket_url"
                          placeholder="https://my-bucket.s3.region.amazonaws.com"
                          value={settings.aws_bucket_url}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-4.5">
                    <button
                      className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                      type="button"
                      onClick={loadSettings}
                    >
                      {t("settingsAdmin.cancelKeys")}
                    </button>
                    <button
                      className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                      type="submit"
                      disabled={loading}
                    >
                      {t("settingsAdmin.saveKeys")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsAdmin;
