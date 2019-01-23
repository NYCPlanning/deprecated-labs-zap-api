/*
 Navicat Premium Data Transfer

 Source Server         : ZAPSearchData-Staging
 Source Server Type    : PostgreSQL
 Source Server Version : 100400
 Source Host           : zap.planninglabs.nyc
 Source Database       : postgres
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 100400
 File Encoding         : utf-8

 Date: 01/24/2019 12:17:18 PM
*/

-- ----------------------------
--  Table structure for "project_geoms"
-- ----------------------------
DROP TABLE IF EXISTS "project_geoms";
CREATE TABLE "project_geoms" (
	"projectid" varchar(10) NOT NULL,
	"centroid" "geometry",
	"polygons" "geometry",
	"created_at" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp(6) NULL,
	"mappluto_v" text
)
WITH (OIDS=FALSE);
ALTER TABLE "project_geoms" OWNER TO "postgres";

-- ----------------------------
--  Create function for getting current timestamp
-- ----------------------------

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------
--  Create trigger for getting current timestamp
-- ----------------------------

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON project_geoms
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- ----------------------------
--  Primary key structure for table "project_geoms"
-- ----------------------------
ALTER TABLE "project_geoms" ADD CONSTRAINT "project_geoms_pkey" PRIMARY KEY ("projectid") NOT DEFERRABLE INITIALLY IMMEDIATE;

