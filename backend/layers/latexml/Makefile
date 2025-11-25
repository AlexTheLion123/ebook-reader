build-LaTeXMLLayer:
	mkdir -p "$(ARTIFACTS_DIR)/bin"
	mkdir -p "$(ARTIFACTS_DIR)/lib/perl5"
	docker run --rm -v "$(ARTIFACTS_DIR)":/opt amazonlinux:2 bash -c 'set -e && yum install -y perl perl-devel perl-App-cpanminus gcc make tar gzip libxml2-devel libxslt-devel perl-XML-LibXML perl-XML-LibXSLT && cpanm --notest LaTeXML && cp -v /usr/local/bin/latexml* /opt/bin/ && cp -r /usr/local/share/perl5/* /opt/lib/perl5/ 2>/dev/null || true && cp -r /usr/local/lib64/perl5/* /opt/lib/perl5/ 2>/dev/null || true && cp -r /usr/share/perl5/* /opt/lib/perl5/ 2>/dev/null || true && cp -r /usr/lib64/perl5/* /opt/lib/perl5/ 2>/dev/null || true && find /opt/lib/perl5 -xtype l -delete && ls -la /opt/bin/ && find /opt/lib/perl5 -name "LaTeXML*" -type d | head -3 && echo "Done"'
