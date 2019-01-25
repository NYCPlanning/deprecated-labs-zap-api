module.exports = function generateXMLDoc(testDocs = []) {
  return `
    <?xml version="1.0" encoding="UTF-8"?>
      <ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
        <Name>labs-zap-supporting-documents</Name>
        <Prefix>comments/1803</Prefix>
        <Marker></Marker>
        <MaxKeys>1000</MaxKeys>
        <IsTruncated>false</IsTruncated>
        ${testDocs.map(doc => `
            <Contents>
              <Key>${doc}</Key>
              <LastModified>2019-01-24T17:38:11.806Z</LastModified>
              <ETag>&quot;c7fcec205eb9e9186ddfb64b525b3bd2&quot;</ETag>
              <Size>388329</Size>
              <StorageClass>STANDARD</StorageClass>
              <Owner>
                <ID>1939427</ID>
                <DisplayName>1939427</DisplayName>
              </Owner>
            </Contents>
          `)}
      </ListBucketResult>
  `;
};
